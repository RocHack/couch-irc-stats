function (keys, values, rereduce) {
	var sum = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	values.forEach(function (value) {
		value.forEach(function (amount, hour) {
			sum[hour] += amount;
		});
	});
	return sum;
}
