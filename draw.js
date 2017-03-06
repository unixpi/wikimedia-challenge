function draw() {
    // TODO
    // define necessary static components in html + css
    // Repeat for bot wikipedia edit component
    
    //STATE
    var queue = [];
    var anonState = {posEdits: 0,
		     negEdits: 0,
		     posBytes: 0,
		     negBytes: 0
		    };

    var humanState = {posEdits: 0,
		      negEdits: 0,
		      posBytes: 0,
		      negBytes: 0
		     };
    
    //END OF STATE

    //SETUP    
    var width = 350;
    var height = 400;
    var projection = d3.geo.orthographic()
	.translate([width / 2, height / 2])
	.scale(width / 2 - 10)
	.clipAngle(90)
	.precision(0.6);

    var canvas = d3.select('#canvas-container').append("canvas")
	.attr("width", width)
	.attr("height", height);

    var c = canvas.node().getContext("2d");

    var path = d3.geo.path()
     .projection(projection)
     .context(c);

    canvas.append("path")
	.datum({type: "Sphere"})
	.attr("class", "water")
	.attr("d", path);

    var url = 'https://stream.wikimedia.org/v2/stream/recentchange';

    console.log('Connecting to EventStreams at ' + url);
    var eventSource = new EventSource(url);

    eventSource.onopen = function(event) {
	console.log('--- Opened connection.');
    };

    eventSource.onerror = function(event) {
	console.error('--- Encountered error', event);
    };

    eventSource.onmessage = function(event) {
	// event.data will be a JSON string containing the message event.
	var dict = JSON.parse(event.data);
	var user = dict.user;
	var magnitude;
	
	//check if user is anonymous and has edited a page
	if (isIPaddress(user) && dict.type === "edit") {
	    magnitude = (dict.length["new"] - dict.length["old"]);
	    dict.magnitude = magnitude;
	    updateStats(dict,anonState,'Anon');
	    updateGlobe(dict);
	};
	//check if user is registered and human and has edited a page
	if (!isIPaddress(user) && dict.type === "edit" && dict.bot === "false") {
	    magnitude = (dict.length["new"] - dict.length["old"]);
	    updateStats(dict,humanState);
	}
		
    };
    
    //***********************************STATS COMPONENT*************************************//
    //update stats
    function updateStats(dict,state,suffix) {
	var bytes = dict.magnitude;
	
	//if the magnitude of the edit is zero,
	//randomly classify it as positive or negative
	if (bytes == 0) {
	   Math.random() < 0.5 ? bytes++ : bytes--
	}

	bytes < 0 ? state.negBytes += bytes : state.posBytes += bytes;

	var sign = bytes < 0 ? "N" : "P";
	sign === "N" ? state.negEdits++ : state.posEdits++;

	var totalEdits = state.posEdits + state.negEdits;
	document.getElementById('totalEdits' + suffix).innerHTML = totalEdits;
	
	document.getElementById('negativeCount' + suffix).innerHTML =
		    (Math.round((state.negEdits / totalEdits) * 100) + "%");
	document.getElementById('positiveCount' + suffix).innerHTML =
	    (Math.round((state.posEdits / totalEdits) * 100) + "%");
	if (state.negBytes < 0) {
	    document.getElementById('negativeBytes' + suffix).innerHTML =
		(Math.abs(Math.round((state.negBytes / state.negEdits))) + " bytes");
	}
	if (state.posBytes > 0) {
	    document.getElementById('positiveBytes' + suffix).innerHTML =
		(Math.round((state.posBytes / state.posEdits)) + " bytes");
	}
    }
    
    //***********************************GLOBE COMPONENT*************************************//
    //updateGlobe
    function updateGlobe(dict) {
	var user = dict.user;
	var url = "http://freegeoip.net/json/" + user;
	//convert ip address to geolocation (lat, lon coordinates)
	//note while this is ok for development, there is a limit of 15000 requests
	//per hour -> will need to deploy own instance of freegeoip web server to heroku
	//for production
	//see https://github.com/fiorix/freegeoip on how to do this
	//if queue is running low,
	//make a request for lat lon co-ordinates and add datum to queue
	if (queue.length < 5) {
	    getJSON(url, function(err,data) {
		lat = data.latitude;
		lon = data.longitude;
		dict.latLong = [lon,lat];
		dict.magnitude = (dict.length["new"] - dict.length["old"]);
		queue.push(dict);
		console.log("queue length is " + queue.length);
	    });
	}
    }
    
    d3.json("world-110m.json", function(world) {
	var caption = d3.select(".caption");
	var countryFill = "lightsteelblue";
	var globe = {type: "Sphere"},
	    land = topojson.feature(world, world.objects.land),
	    countries = topojson.feature(world, world.objects.countries).features,
	    borders = topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; });

	d3.transition()
	    .duration(5000)
	    .each("start", function() {
	    })
		.tween("rotate", function() {
		    r = d3.interpolate(projection.rotate(), [0,0]);
		    return function(t) {
			//rotate globe and draw countries
			projection.rotate(r(t));
			c.clearRect(0, 0, width, height);
			c.fillStyle = countryFill, c.beginPath(), path(land), c.fill();
			c.strokeStyle = "white", c.lineWidth = 1, c.beginPath(), path(borders),
			c.stroke();
			c.lineWidth= 0.5, c.shadowBlur = 1, c.shadowColor="lightgrey", c.beginPath(),
			path(globe), c.stroke();
		    };
		});

	function updateMap() {
	    var edit = queue.shift();
	    if (edit) {
		console.log(edit.magnitude);
		
		//if the magnitude of the edit is zero,
		//randomly classify it as positive or negative
		if (edit.magnitude == 0) {
		   Math.random() < 0.5 ? edit.magnitude++ : edit.magnitude--
		}

		var bytes = edit.magnitude;
		
		var sign = edit.magnitude < 0 ? "N" : "P";
		
		d3.transition()
		    .duration(2500)
		    .each("start", function() {
			var absBytes = Math.abs(+bytes);
			var suffix = (absBytes === 1) ? " byte" : " bytes";
			caption.html(edit.title + " (" + Math.abs(+bytes) + suffix + ")");
		    })
		    .tween("rotate", function() {
			var p = edit.latLong,
				r = d3.interpolate(projection.rotate(), [-p[0], -p[1]]);
			    return function(t) { //t refers to time spent tweening so far
				// Rotate the earth so that the new point is front and center.
				projection.rotate(r(t));
				// Erase the canvas.
				c.clearRect(0, 0, width, height);
				// Color in land masses.
				c.fillStyle = countryFill,
				c.beginPath(),
				path(land),
				c.fill();
				// Draw the country borders.
				c.strokeStyle = "white",
				c.lineWidth = 1,
				c.beginPath(),
				path(borders),
				c.stroke();
				// Draw the earth's circumference
				c.lineWidth=0.5,
				c.shadowBlur = 1,
				c.shadowColor="lightgrey",
				c.beginPath(),
				path(globe),
				c.stroke();
				// Get the canvas-coordinates of the latLong points associated with the latest edit we have
				var center = projection(p);				

				function setRadius(r) {
				    if (r == 0) { r = 3 };
				    c.fillStyle = sign === "P" ? "rgba(0,0,200,0.5)" :
					"rgba(227, 38, 54,0.7)",
				    c.beginPath(),
				    c.arc(center[0], center[1],r, 0, 2 * Math.PI, false),
				    c.lineWidth = 0.5,
				    c.fill(),
				    c.stroke();
				}
				setRadius(3 + 1.5 * (t * Math.log(Math.abs(edit.magnitude) + 1)), sign);
			    } 
		    });
	    }
	    console.log("map updating");
	}
	//every 5 seconds check queue array to see if you have received an edit,
	//if you have, remove it from queue array, add its coordinates to map
//	window.setTimeout(updateMap, 3000);
	window.setInterval(updateMap, 5000);
    });

    //HELPER FUNCTIONS
    function getJSON(url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'json';
	xhr.onload = function() {
	    var status = xhr.status;
	    if (status == 200) {
		callback(null, xhr.response);
	    } else {
		callback(status);
	    }
	};
	xhr.send();
    };
    
    function isIPaddress(user) {
	var segments = user.split(".");
	if(segments.length === 4) {
	    return segments.every(function(segment) {
		return parseInt(segment,10) >=0 && parseInt(segment,10) <= 255;
	    });
	}
	return false;
    }
}

