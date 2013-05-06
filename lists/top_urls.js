function(head, req) {
	var row,
		// unique values
		values = [],
		valuesByUrl = {};
	// group values by url
	while (row = getRow()) {
		var url = row.key && row.key[row.key.length-1] || null;
		var value = row.value;
		value.url = url;
		if (url in valuesByUrl) {
			valuesByUrl[url].count += value.count;
		} else {
			valuesByUrl[url] = value;
			values.push(value);
		}
	}
	// sort by count
	values.sort(function (a, b) {
		return b.count - a.count;
	});
	return toJSON(values);
}
