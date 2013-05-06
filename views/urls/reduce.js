function (keys, values, rereduce) {
	var first = values[0];
	if (!first) return null;
	for (var i = 1; i < values.length; i++) {
		var value = values[i];
		first.count += value.count;
		if (value.time > first.time) {
			first.time = value.time;
			first.sender = value.sender;
		}
	}
	return first;
}

