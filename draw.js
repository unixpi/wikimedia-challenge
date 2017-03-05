function draw() {

    var loaded = false;
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

    var title = d3.select(".title");

    var countryFill = "lightsteelblue";

    d3.json("world-110m.json", function(world) {
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
			c.strokeStyle = "white", c.lineWidth = 1, c.beginPath(), path(borders), c.stroke();
			c.lineWidth= 0.5, c.shadowBlur = 1, c.shadowColor="lightgrey", c.beginPath(), path(globe), c.stroke();
		    };
		});
    });

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
	
	if (isIPaddress(user)) {
	    var url = "http://freegeoip.net/json/" + user;
	    //convert ip address to geolocation (lat, lon coordinates)
	    //note while this is ok for development, there is a limit of 15000 requests
	    //per hour -> will need to deploy own instance of freegeoip web server to heroku
	    //for production
	    //see https://github.com/fiorix/freegeoip on how to do this
	    getJSON(url, function(err,data) {
		lat = data.latitude;
		lon = data.longitude;
		console.log("lat : " + lat + " , " + "lon : " + lon);
		return [lat,lon];
	    });
	};
    };

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

