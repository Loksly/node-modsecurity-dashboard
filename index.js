(function(){
	'use strict';

	const path = require('path'),
		Tail = require('always-tail'),
		TCA = require('tailable-capped-array'),
		express = require('express'),
		app = express(),
		config = require('./config.json');

	const elements = new TCA(config.size),
		tail = new Tail(config.logfile, "\n", {start: 0});

	const state = {
		lastitem: false,
		lastid: '',
		partid: '',
		laststring: ''
	};

	tail.on('line', function(data){
		data = data.replace("\r", '');

		if (data.startsWith('-') && data.endsWith('-A--')){
			state.lastid = data.substring(0, (data.length - '-A--'.length));
			state.partid = 'A';
			state.laststring = '';
			
			state.lastitem = {id: state.lastid.replace(/-/g, '')};
			
		} else if (data.startsWith(state.lastid)){

			if (state.partid !== ''){
				state.lastitem[state.partid] = state.laststring;
			}
			state.partid = data.substring(state.lastid.length, data.length).replace(/-/g, '');
			state.laststring = '';

			if (state.partid === 'Z'){
				elements.push(state.lastitem);
			}

		} else {
			state.laststring += data + "\n";
		}
	});

	tail.watch();

	app.get(config.resource, function(req, res){
		res.jsonp(elements.toArray());
	});

	app.use('/', express.static(path.join(__dirname, 'public')));

	app.listen(config.port);
})();
