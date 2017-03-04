function draw() {
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

