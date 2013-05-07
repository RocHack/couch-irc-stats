function(doc) {
	function mapMessage(msg) {
		if (typeof msg.text != "string") return;
		var d = new Date(msg.date || (msg._id * 1000));
		msg.text.split(/\s+/).forEach(function (word) {
			var m = word.match(/(.*?)[(?:\+\+)(--)](.*)/);
			var id = m && m[1];
			if (!id) return;
			m = word.match(/(.*?)((?:\+\+)+)\+?(.*)/);
			var plus = m && m[2].length;
			m = word.match(/(.*?)((?:--)+)-?(.*)/);
			var minus = m && m[2].length;
			var val = (plus - minus) / 2;
			if (!val) return;
			var key = [
				d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), id
			];
			emit(key, val);
		});
	}

	if (doc.ignore) return;
	if (doc._id.indexOf("-") != -1) {
		// If this doc just has a start and end time for a bunch of messages,
		// emit the messages at regular intervals between the start and end
		var s = doc._id.split("-");
		var start = new Date(s[0] * 1000).getTime();
		var end = new Date(s[1] * 1000).getTime();
		if (isNaN(start) || isNaN(end)) return;
		var lines = doc.text.split("\n");
		var step = (end - start) / (lines.length - 1);
		var messages = lines.map(function (line, i) {
			return {
				text: line,
				date: start + step*i
			};
		});
		messages.forEach(mapMessage);
	} else {
		mapMessage(doc);
		if (doc.messages) doc.messages.forEach(mapMessage);
	}
}
