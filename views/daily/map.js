function(doc) {
	function mapMessageAmounts(msg) {
		if (typeof msg.text != "string") return;
		var d = new Date((msg.date || msg._id * 1000));
		if (isNaN(d)) return;
		// shift midnight to 6AM
		d.setHours(d.getHours()-6);
		var Y = d.getFullYear(),
		M = d.getMonth() + 1,
		D = d.getDate();

		//emit([channel, Y, M, D, msg.sender], null);
		emit([Y, M, D, msg.sender], null);
	}

	if (doc._id.indexOf("-") != -1) {
		// If this doc just has a start and end time for a bunch of messages,
		// emit the messages at regular intervals between the start and end
		var s = doc._id.split("-");
		var start = new Date(s[0] * 1000).getTime();
		var end = new Date(s[1] * 1000).getTime();
		if (isNaN(start) || isNaN(end)) return;
		var messages = doc.text.split("\n");
		var step = (end - start) / (messages.length - 1);
		//var channel = doc.channel;
		var sender = null; // dunno
		messages.forEach(function (message, i) {
			var d = new Date(start + step * i);
			if (isNaN(d)) return;
			var Y = d.getFullYear(),
			M = d.getMonth() + 1,
			D = d.getDate();
			//emit([channel, Y, M, D, sender], null);
			emit([Y, M, D, sender], null);
		});
	} else {
		// Emit for this message
		mapMessageAmounts(doc);
		// Emit for each message
		if (doc.messages) doc.messages.forEach(mapMessageAmounts);
	}
}

