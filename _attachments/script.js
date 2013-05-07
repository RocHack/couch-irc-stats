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
}

function dateToKey(date, inclusive) {
	return "[" +
		date.getFullYear() + "," +
		date.getMonth() + "," +
		date.getDate() +
		(inclusive ? ",{}]" : "]");
}

function makeRangeQuery(extent) {
	return "startkey=" + dateToKey(extent[0]) +
		"&endkey=" + dateToKey(extent[1], true);
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
			.style("opacity", 1);
		return this;
	}
	return this.transition().duration(duration);
}

var brushed = debounce(function() {
	updateHistograms(brush.extent());
}, 100);

var dev = location.host == 'localhost';
var base = dev ? '/couchdb/markov/_design/irc_stats/' : '';

// Timeline

var margin = {top: 10, right: 20, bottom: 20, left: 20},
    width = 820 - margin.left - margin.right,
	height = 100 - margin.top - margin.bottom,
	initialSelection = dev ? 0.5 : 0.12;

	var x = d3.time.scale().range([0, width]),
		y = d3.scale.linear().range([height, 0]);

	var xAxis = d3.svg.axis().scale(x).orient("bottom");

	var brush = d3.svg.brush()
	.x(x)
	.extent([1 - initialSelection, 1])
    .on("brush", brushed);

var area = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x(d.date); })
    .y0(height)
    .y1(function(d) { return y(d.value).toFixed(0); });

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
	.attr("transform", "translate(0," + height + ")");

function gotTimeline(error, resp) {
	var data = resp.rows;
	data.forEach(function(d) {
		d.date = new Date(d.key[0], d.key[1], d.key[2]);
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
	// update the ranges
	hourlyDistribution(extent);
	weeklyDistribution(extent);
	topURLs(extent);
	karmaGraph(extent);
}

// Distribution histograms

var svg = d3.select("#active-times").append("svg")
	.attr("class", "chart");

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

	var margin = {top: 40, right: 320, bottom: 20, left: 20},
		width = 760 - margin.left - margin.right,
		height = 140 - margin.top - margin.bottom,
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
		.attr("x", function(d, i) { return x(i) - 0.5; })
		.attr("y", function(d) { return height - y(d) - 0.5; })
		.attr("width", w)
		.attr("height", function(d) { return y(d); })
		.style("fill", function(d, i) { return color(i); });

	hourlyChart.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + (height - 1) + ")")
		.call(xAxis);

	hourlyChart.append("text")
		.attr("x", width/2)
		.attr("y", -10)
		.attr("text-anchor", "middle")
		.attr("class", "heading")
		.text("Hourly activity");

	function gotData(error, resp) {
		var newData = getFirstValue(resp) || zeros;
		data = newData;

		y.domain([0, d3.max(data)]);
		rect.data(data);
		transitionOrFade.call(rect, 1000)
			.attr("y", function(d) { return height - y(d) - 0.5; })
			.attr("height", function(d) { return y(d); });
	}

	return function updateRange(extent) {
		var query = makeRangeQuery(extent);
		d3.json(base + "_view/hourly_distribution?" + query, gotData);
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
		[0,0,0,0,0,0,0], [0,0,0,0,0,0,0], [0,0,0,0,0,0,0]
	];

	var margin = {top: 40, right: 20, bottom: 20, left: 520},
		width = 760 - margin.left - margin.right,
		height = 140 - margin.top - margin.bottom,
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
		.attr("y1", height + 0.5)
		.attr("y2", height + 0.5)
		.attr("x2", width - 1);

	// Add labels for the weekdays
	weeklyChart.selectAll(".weekday")
		.data("Sun Mon Tue Wed Thu Fri Sat".split(" "))
		.enter().append("text")
		.attr("class", "weekday")
		.attr("x", function (d, i) { return x(i + 0.5); })
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
		.attr("y", -10)
		.attr("text-anchor", "middle")
		.attr("class", "heading")
		.text("Daily activity");

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
		// convert 1d array to 2d array
		var deepData = [
			[], [], [], [], [], [], [], [], [], [], [], [],
			[], [], [], [], [], [], [], [], [], [], [], []];
		for (var i = 0; i < 24; i++)
			for (var j = 0; j < 7; j++)
				deepData[i][j] = newData[24*j + i];

		data = stack(deepData);
		window.data = data;
		window.newData = newData;

		y.domain([0, d3.max(data, function (layer) {
			return d3.max(layer, function (d) { return d.y + d.y0; });
		})]);
		hours.data(data);
		rect.data(Object);
		transitionOrFade.call(rect, 1000)
			.attr("y", function(d) { return height - y(d.y0 || 0) - 0.5; })
			.attr("height", function(d) { return y(d.y || 0); });
	}

	return function updateRange(extent) {
		var query = makeRangeQuery(extent);
		d3.json(base + "_view/weekly_distribution?" + query, gotData);
	};
}());

var topURLs = (function () {
	var limit = 5;
	var tr = d3.select("#top-urls tbody").selectAll("tr");

	function rank(d, i) { return i + 1; }
	function url(d) { return d.url; }
	function times(d) { return d.count; }
	function sender(d) { return d.sender || ""; }

	function gotData(error, values) {
		tr = tr.data(values.slice(0, limit), url);
		var trEnter = tr.enter().append("tr");
		trEnter.append("td").attr("class", "rank");
		trEnter.append("td").attr("class", "url").append("a");
		trEnter.append("td").attr("class", "times");
		trEnter.append("td").attr("class", "sender");
		tr.exit().remove();

		tr.select(".rank").datum(rank).text(String);
		tr.select(".url a").datum(url).text(String).attr("href", String);
		tr.select(".times").datum(times).text(String);
		tr.select(".sender").datum(sender).text(String);
		tr.order();
	}

	return function updateRange(extent) {
		var query = makeRangeQuery(extent) + "&group=true";
		d3.json(base + "_list/top_urls/urls?" + query, gotData);
	};
}());

var karmaGraph = (function () {
	var svg = d3.select("#karma").append("svg");
	var extent = [];
	var limit = 6;

	var margin = {top: 40, right: 40, bottom: 20, left: 60},
		width = 760 - margin.left - margin.right,
		height = 140 - margin.top - margin.bottom;

	var x = d3.time.scale().range([0, width]),
		y = d3.scale.pow().range([height, 0]);

	var xAxis = d3.svg.axis().scale(x).orient("bottom");
	var yAxis = d3.svg.axis().scale(y).orient("right").ticks(4);

	var chart = svg.append("g")
		//.attr("class", "hourly")
		.attr("transform", "translate(" +
			margin.left + "," + margin.top + ")");

	var line = d3.svg.line()
	    .x(function date(d) { return x(d.date); })
		.y(function value(d) { return y(d.value); });

	var path = svg.append("path")
		.attr("class", "line")

	var xAxisG = chart.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + (height) + ")");

	var yAxisG = chart.append("g")
		.attr("class", "y axis")
		.attr("transform", "translate(" + (width) + ",0)");

	chart.append("text")
		.attr("x", width/2)
		.attr("y", -10)
		.attr("text-anchor", "middle")
		.attr("class", "heading")
		.text("Karma");

	var color = d3.scale.category10();

	function gotData(error, resp) {
		var row,
			rows = resp.rows,
			data = [],
			dataByName = {};

		rows.forEach(function(row) {
			var key = row.key;
			row.date = new Date(key[0], key[1], key[2], key[3]);
			row.name = key[4];
		});

		for (var i = 0; i < rows.length; i++) {
			row = rows[i];
			var date = row.date,
				name = row.name,
				item = dataByName[name],
				sum = row.value;

			if (item) {
				sum = item.sum += sum;
			} else {
				item = dataByName[name] = {
					sum: sum,
					name: name,
					values: []
				};
				data.push(item);
			}
			row.sum = sum;
			item.values.push({
				date: date,
				value: sum
			});
		}

		data.sort(function (a, b) {
			return b.values.length - a.values.length;
		});
		data = data.slice(0, limit);

		x.domain(extent);
		var values = d3.merge(data.map(function(d) { return d.values; }));
		var range = d3.extent(values, function(row) { return row.value; });

		if (range[0] == range[1]) range = [-2, 2];
		if (range[0] > 0) range[0] = 0;
		y.domain(range);

		xAxis(xAxisG);
		yAxis(yAxisG);

		var name = chart.selectAll(".name")
			.data(data, function(d) { return d.name; })
		var nameEnter = name.enter().append("g")
			.attr("class", "name");
		var path = nameEnter
			.append("path")
			.attr("class", "line")
			.style("opacity", 0)
		name.exit()
			.transition()
			.style("opacity", 0)
			.remove();

		name.select("path")
			.transition()
			.duration(500)
			.style("opacity", 1)
			.attr("d", function(d) { return line(d.values); })
			.style("stroke", function(d) { return color(d.name); });

		nameEnter.append("text")
			.style("opacity", 0)
			.attr("x", 3)
			.attr("dy", ".35em")
			.datum(Object)
			.text(function(d) { return d.name; })
			.style("fill", function(d) { return color(d.name); })
			.transition()
			.duration(500)
			.style("opacity", 1);
		name.select("text")
			.datum(function(d) { return d.values[d.values.length-1]; })
			.attr("transform", function(d) { return "translate(" + x(d.date) + "," + y(d.value) + ")"; })
	}

	return function(ext) {
		extent = ext;
		var query = makeRangeQuery(extent) + "&group=true";
		d3.json(base + "_view/karma?" + query, gotData);
	};
}());
