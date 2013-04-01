function debounce(fn, ms) {
	var timeout, context, args;
	function exec() {
		fn.apply(context, args);
	}
	return function () {
		context = this;
		args = arguments;
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(exec, ms || 50);
	};
};

function dateToKey(date, inclusive) {
	return "[" +
		date.getFullYear() + "," +
		(date.getMonth() + 1) + "," +
		date.getDate() + (inclusive ? ",{}]" : "]");
}

function makeRangeQuery(start, end) {
	return "startkey=" + dateToKey(start) +
		"&endkey=" + dateToKey(end, true);
}

function getFirstValue(resp) {
	return resp && resp.rows && resp.rows[0] && resp.rows[0].value;
}

function transitionOrFade(duration) {
	if (!this.transitioned) {
		this.transitioned = true;
		this.style("opacity", 0)
			.transition()
			.duration(duration/4)
			.style("opacity", 1)
		return this;
	}
	return this.transition().duration(duration);
}

var dev = location.host == 'localhost';
var base = dev ? '/couchdb/markov/_design/irc_stats/' : '';

// Timeline

var margin = {top: 10, right: 20, bottom: 20, left: 20},
    width = 900 - margin.left - margin.right,
    height = 90 - margin.top - margin.bottom,
	initialSelection = dev ? .5 : 0.12;

var x = d3.time.scale().range([0, width]),
    y = d3.scale.linear().range([height, 0]);

var xAxis = d3.svg.axis().scale(x).orient("bottom");

var brush = d3.svg.brush()
    .x(x)
	.extent([1 - initialSelection, 1])
    .on("brush", brush);

var area = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x(d.date); })
    .y0(height)
    .y1(function(d) { return y(d.value); });

var context = d3.select("#timeline").append("svg")
	.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var path = context.append("path");

// Add brush
context.append("g")
	.attr("class", "x brush")
	.call(brush)
	.selectAll("rect")
	.attr("y", -6)
	.attr("height", height + 7);

var xAxisG = context.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + height + ")")

function gotTimeline(error, resp) {
	var data = resp.rows;
	data.forEach(function(d) {
		d.date = new Date(d.key);
	});

	x.domain(d3.extent(data.map(function(d) { return d.date; })));
	y.domain([0, d3.max(data.map(function(d) { return d.value; }))]);

	path.datum(data)
		.attr("d", area);

	xAxis(xAxisG);

	// get date extent in brush
	var extent = brush.extent();
	if (!(extent[0] instanceof Date)) {
		extent = extent.map(x.copy().range([0, 1]).invert);
	}
	updateHistograms(extent);
}

function timeline() {
	var query = "group_level=3";
	d3.json(base + "_view/daily?" + query, gotTimeline);
}
timeline();
// refresh the timeline every 5 minutes
setInterval(timeline, 5 * 60 * 1000);

function updateHistograms(extent) {
	if (extent.some(isNaN)) {
		console.log('bad extent', extent);
	}
	hourlyDistribution.updateRange(extent[0], extent[1]);
	weeklyDistribution.updateRange(extent[0], extent[1]);
}

function brush() {
	updateHistograms(brush.extent());
}

// Distribution histograms

var svg = d3.select("#active-times").append("svg")
	.attr("class", "chart")

function color(n) {
	if (n in color) return color[n];
	var t = n / 12 * Math.PI;
	return color[n] = d3.lab(
		70,
		0 - 50 * Math.sin(t),
		0 - 75 * Math.cos(t)
	);
}

var hourlyDistribution = (function () {
	var zeros = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	var data = zeros;

	var margin = {top: 20, right: 320, bottom: 20, left: 20},
		width = 760 - margin.left - margin.right,
		height = 120 - margin.top - margin.bottom,
		w = width / 24;

	var x = d3.scale.linear().range([0, width]).domain([0, 24]),
		y = d3.scale.linear().range([0, height]);

	var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(24)
		.tickFormat(function (n) { return (n + 6) % 24; });

	var hourlyChart = svg.append("g")
		.attr("class", "hourly")
		.attr("transform", "translate(" +
			margin.left + "," + margin.top + ")");

	var rect = hourlyChart.selectAll("rect")
		.data(zeros)
		.enter().append("rect")
		.attr("x", function(d, i) { return x(i) - .5; })
		.attr("y", function(d) { return height - y(d) - .5; })
		.attr("width", w)
		.attr("height", function(d) { return y(d); })
		.style("fill", function(d, i) { return color(i); });

	hourlyChart.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + (height - 1) + ")")
		.call(xAxis);

	hourlyChart.append("text")
		.attr("x", width/2)
		.attr("y", height + 40)
		.attr("text-anchor", "middle")
		.attr("class", "activity-heading")
		.text("Hourly activity")

	function updateRange(start, end) {
		var query = makeRangeQuery(start, end);
		d3.json(base + "_view/hourly_distribution?" + query, gotData);
	}

	function gotData(error, resp) {
		var newData = getFirstValue(resp) || zeros;
		data = newData;

		y.domain([0, d3.max(data)]);
		rect.data(data)
		transitionOrFade.call(rect, 1000)
			.attr("y", function(d) { return height - y(d) - .5; })
			.attr("height", function(d) { return y(d); });
	}

	return {
		updateRange: debounce(updateRange, 100)
	};
}());

var weeklyDistribution = (function () {
	var data = [
		[0,0,0,0,0,0,0], [0,0,0,0,0,0,0], [0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0], [0,0,0,0,0,0,0], [0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0], [0,0,0,0,0,0,0], [0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0], [0,0,0,0,0,0,0], [0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0], [0,0,0,0,0,0,0], [0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0], [0,0,0,0,0,0,0], [0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0], [0,0,0,0,0,0,0], [0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0], [0,0,0,0,0,0,0], [0,0,0,0,0,0,0],
	];

	var margin = {top: 20, right: 20, bottom: 20, left: 520},
		width = 760 - margin.left - margin.right,
		height = 120 - margin.top - margin.bottom,
		w = width / 7;

	var x = d3.scale.linear().range([0, width]).domain([0, 7]),
		y = d3.scale.linear().range([0, height]);

	var weeklyChart = svg.append("g")
		.attr("class", "week")
		.attr("transform", "translate(" +
			margin.left + "," + margin.top + ")");

	// Add line under the chart
	weeklyChart.append("svg:line")
		.style("stroke", "#000")
		.attr("x1", 0)
		.attr("y1", height + .5)
		.attr("y2", height + .5)
		.attr("x2", width - 1)

	// Add labels for the weekdays
	weeklyChart.selectAll(".weekday")
		.data("Sun Mon Tue Wed Thu Fri Sat".split(" "))
		.enter().append("text")
		.attr("class", "weekday")
		.attr("x", function (d, i) { return x(i + .5); })
		.attr("text-anchor", "middle")
		.attr("y", height + 14)
		.text(String);

	// Add a group for each hour.
	var hours = weeklyChart.selectAll("g.hour")
		.data(data)
		.enter().append("g")
		.attr("class", "hours")
		.style("fill", function(d, i) { return color(i); })
		.style("stroke", function(d, i) { return d3.rgb(color(i)).darker(); });

	var rect = hours.selectAll("rect")
		.data(Object)
		.enter().append("rect")
		.attr("x", function(d, i) { return x(i); })
		.attr("width", w - 1);

	weeklyChart.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + (height - 1) + ")");

	weeklyChart.append("text")
		.attr("x", width/2)
		.attr("y", height + 40)
		.attr("text-anchor", "middle")
		.attr("class", "activity-heading")
		.text("Daily activity")

	function updateRange(start, end) {
		var query = makeRangeQuery(start, end);
		d3.json(base + "_view/weekly_distribution?" + query, gotData);
	}

	function stack(data) {
		var y0 = [0,0,0,0,0,0,0];
		return data.map(function (d) {
			return d.map(function (n, i) {
				return {
					y: n,
					y0: y0[i] += n
				};
			});
		});
	}

	var first = true;
	function gotData(error, resp) {
		var newData = getFirstValue(resp) || [];
		data = stack(newData);
		window.data = data;
		window.newData = newData;

		y.domain([0, d3.max(data, function (layer) {
			return d3.max(layer, function (d) { return d.y + d.y0; });
		})]);
		hours.data(data);
		rect.data(Object)
		transitionOrFade.call(rect, 1000)
			.attr("y", function(d) { return height - y(d.y0) - .5; })
			.attr("height", function(d) { return y(d.y); });
	}

	return {
		updateRange: debounce(updateRange, 100)
	};
}());