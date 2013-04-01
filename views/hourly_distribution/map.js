function mapMessageHour(msg) {
	if (typeof msg.text != "string") return;
	var d = new Date(msg.date || (msg._id * 1000));
	if (isNaN(d)) return;
	// shift midnight to 6AM
	d.setHours(d.getHours()-6);
	var Y = d.getFullYear(),
	M = d.getMonth() + 1,
	D = d.getDate(),
	h = d.getHours();
	var hours = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	hours[h] = 1;

	//emit([msg.channel, Y, M, D, msg.sender], hours);
	emit([Y, M, D, msg.sender], hours);
}

function(doc) {
	mapMessageHour(doc);
	if (doc.messages) doc.messages.forEach(mapMessageHour);
}
