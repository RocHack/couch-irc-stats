function(doc) {
	var urlRegex = /[a-z]{1,10}:\/\/[^ ]*/g;

	function mapMessage(msg) {
		if (typeof msg.text != "string") return;
		var time = msg.date || (msg._id * 1000);
		var d = new Date(time);
		if (isNaN(d)) return;
		// shift midnight to 6AM
		d.setHours(d.getHours()-6);
		var D = d.getDate(),
			M = d.getMonth(),
			Y = d.getFullYear(),
			urls = msg.text.match(urlRegex);
		if (urls) for (var i = 0; i < urls.length; i++) {
			var url = urls[i];
			emit([Y, M, D, url], {
				sender: msg.sender,
				time: time,
				count: 1
			});
		}
	}

	mapMessage(doc);
	if (doc.messages) doc.messages.forEach(mapMessage);
}

