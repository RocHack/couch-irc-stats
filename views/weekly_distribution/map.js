function(doc) {
	function mapMessageDay(msg) {
		if (typeof msg.text != "string") return;
		var d = new Date(msg.date || (msg._id * 1000));
		if (isNaN(d)) return;
		// shift midnight to 6AM
		d.setHours(d.getHours()-6);
		var day = d.getDay(),
			D = d.getDate(),
			h = d.getHours();

		// round down to start of week
		d.setDate(D - day);
		D = d.getDate();
		var Y = d.getFullYear(),
			M = d.getMonth() + 1;
		var hours = [
			0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0,
			0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0,
			0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0,
			0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0,
			0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0,
			0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0,
			0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0, 0,0,0,0,0,0
		];
		hours[day*24 + h] = 1;

		emit([Y, M, D, msg.sender], hours);
	}

	mapMessageDay(doc);
	if (doc.messages) doc.messages.forEach(mapMessageDay);
}

