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
	    console.log(user)
	}
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

