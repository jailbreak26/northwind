#!/usr/bin/env node
var http = require('http'),
	request = require('request'),
	fs = require('fs'),
	domain = require('domain'),
	index = require('zlib').gzipSync(fs.readFileSync('index.html'))
	favicon = require('zlib').gzipSync(fs.readFileSync('favicon.ico'))
	crossdomainXML = require('zlib').gzipSync(fs.readFileSync('crossdomain.xml'))
	port = process.env.PORT || 8899,
	allowedOriginalHeaders = new RegExp('^' + require('./allowedOriginalHeaders.json').join('|'), 'i')
	bannedUrls = new RegExp(require('./bannedUrls.json').join('|'), 'i'),
	requestOptions = {
		encoding: null,
		rejectUnauthorized: false,
		headers: {
			'accept-encoding': 'identity'
		}
	},
	server = http.createServer(function (req, res) {
		var d = domain.create();
		d.on('error', function (e){
			console.log('ERROR', e.stack);

			res.statusCode = 500;
			res.end('Error: ' + ((e instanceof TypeError) ? "make sure your URL is correct" : String(e)));
		});

		d.add(req);
		d.add(res);

		d.run(function() {
			handler(req, res);
		});
	}).listen(port),
	handler = function handler(req, res) {
		switch (req.url) {
			case "/":
			case "/index.html" :
				res.setHeader('content-type', 'text/html')
				res.setHeader('content-encoding', 'gzip')
				res.writeHead(200);
				res.write(index);
				res.end();
				break;
			case "/favicon.ico":
				res.setHeader('content-encoding', 'gzip')
				res.setHeader('content-type', 'image/x-icon')
				res.writeHead(200);
				res.write(favicon);
				res.end();
				break;
			case "/crossdomain.xml":
				res.setHeader('content-encoding', 'gzip')
				res.setHeader('content-type', 'application/xml')
				res.writeHead(200);
				res.write(crossdomainXML);
				res.end();
				break;		
			default:
				if (bannedUrls.test(req.url)) {
					res.writeHead(403);
					res.end('FORBIDDEN');
				} else {
				try {
					res.setTimeout(25000);
					res.setHeader('Access-Control-Allow-Origin', '*');
					res.setHeader('Access-Control-Allow-Credentials', false);
					res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
					res.setHeader('Expires', new Date(Date.now() + 86400000).toUTCString()); // one day in the future
					var r = request(req.url.slice(1), requestOptions);
					r.pipefilter = function(response, dest) {
						for (var header in response.headers) {
							if (!allowedOriginalHeaders.test(header)) {
								dest.removeHeader(header);	
							}
						}
					};
					r.pipe(res);
				} catch (e) {
					res.end('Error: ' +  ((e instanceof TypeError) ? "make sure your URL is correct" : String(e)));
				}
			}
		}
	}
(function() {

        if (window.XMLHttpRequest) {

          function parseURI(url) {
            var m = String(url).replace(/^\s+|\s+$/g, "").match(/^([^:\/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
            // authority = "//" + user + ":" + pass "@" + hostname + ":" port
            return (m ? {
              href : m[0] || "",
              protocol : m[1] || "",
              authority: m[2] || "",
              host : m[3] || "",
              hostname : m[4] || "",
              port : m[5] || "",
              pathname : m[6] || "",
              search : m[7] || "",
              hash : m[8] || ""
            } : null);
          }

          function rel2abs(base, href) { // RFC 3986

            function removeDotSegments(input) {
              var output = [];
              input.replace(/^(\.\.?(\/|$))+/, "")
                .replace(/\/(\.(\/|$))+/g, "/")
                .replace(/\/\.\.$/, "/../")
                .replace(/\/?[^\/]*/g, function (p) {
                  if (p === "/..") {
                    output.pop();
                  } else {
                    output.push(p);
                  }
                });
              return output.join("").replace(/^\//, input.charAt(0) === "/" ? "/" : "");
            }

            href = parseURI(href || "");
            base = parseURI(base || "");

            return !href || !base ? null : (href.protocol || base.protocol) +
            (href.protocol || href.authority ? href.authority : base.authority) +
            removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === "/" ? href.pathname : (href.pathname ? ((base.authority && !base.pathname ? "/" : "") + base.pathname.slice(0, base.pathname.lastIndexOf("/") + 1) + href.pathname) : base.pathname)) +
            (href.protocol || href.authority || href.pathname ? href.search : (href.search || base.search)) +
            href.hash;

          }

          var proxied = window.XMLHttpRequest.prototype.open;
          window.XMLHttpRequest.prototype.open = function() {
              if (arguments[1] !== null && arguments[1] !== undefined) {
                var url = arguments[1];
                url = rel2abs("' . $url . '", url);
                url = "' . PROXY_PREFIX . '" + url;
                arguments[1] = url;
              }
              return proxied.apply(this, [].slice.call(arguments));
          };

        }

      })();
