	'use strict';

	function parseA(str){
		const tokens = str.split(' '),
			obj = {
				when: (tokens[0] + ' ' + tokens[1]).substring(1, (tokens[0] + ' ' + tokens[1]).indexOf(']')),
				remoteip: tokens[3],
				remoteport: tokens[4],
				localip: tokens[5],
				localport: tokens[6],
			};

		return obj;
	}

	function parseB(str){
		const lines = str.split("\n");

		const first = lines.shift().split(' ');
		const obj = {
			method: first[0],
			resource: first[1]
		};

		return lines.reduce(function(p, line){
			const key = line.substring(0, line.indexOf(':'));
			const value = line.substring(line.indexOf(':') + 1, line.length).trim();

			p[key] = value;
			return p;
		}, obj);
	}

	function parseF(str){
		const lines = str.split("\n"),
			first = lines.shift().split(' '),
			obj = {
				version: first.shift(),
				status: first.shift(),
				status_message: first.join(' ')
			};

		return lines.reduce(function(p, line){
			const key = line.substring(0, line.indexOf(':')),
				value = line.substring(line.indexOf(':') + 1, line.length).trim();

			p[key] = value;
			return p;
		}, obj);
	}

	const parsers = {A: parseA, B: parseB, F: parseF},
		status = {
			'2': 'list-group-item-success',
			'3': 'list-group-item-info',
			'4': 'list-group-item-warning',
			'5': 'list-group-item-danger'
		},
		methods = {
			'head': 'label-warning',
			'get': 'label-default',
			'post': 'label-success',
			'put': 'label-info',
			'patch': 'label-primary',
			'delete': 'label-danger'
		};

	angular
		.module('md', [])
		.constant('MAXSIZE', 50)
		.config(['$sceDelegateProvider', function($sceDelegateProvider){
			$sceDelegateProvider.resourceUrlWhitelist([
				'self'
			]);
		}])
		.filter('labelClass', function(){
			return function(val){
				return val && (typeof methods[val.toLowerCase()] === 'string') ? methods[val.toLowerCase()] : '';
			};

		})
		.filter('statusClass', function(){
			return function(val){
				var idx = String(val.charAt(0));

				return typeof status[idx] === 'string' ? status[idx] : '';
			};

		})
		.controller('dashboard', ['$rootScope', '$http', '$log', '$interval', '$location', 'MAXSIZE',
			function($rootScope, $http, $log, $interval, $location, MAXSIZE){
				const searchObject = $location.search();
				$rootScope.selected = false;
				$rootScope.setSelected = function(e){
					$rootScope.selected = e;
				};
				$rootScope.elements = [];
				function notify(e, txt) {

					if (!("Notification" in window)) {
						$log.log("This browser does not support desktop notification");
					} else if (Notification.permission === 'granted') {
						var notification = new Notification(txt);
						notification.onclick = function(event) {
							$rootScope.setSelected(e);
						};
					} else if (Notification.permission !== 'denied') {
						Notification.requestPermission(function (permission) {
							if (permission === 'granted') {
								var notification = new Notification(txt);
								notification.onclick = function(event) {
									$rootScope.setSelected(e);
								};
							}
						});
					}
				}

				function refresh(){
					$http.get('elements').then(function(elements){
							const alreadyInside = $rootScope.elements.map(function(e){
								return e.id;
							});
							let newMessage = false;

							elements.data.reduce(function(p, element){
								const obj = {};
								Object.keys(parsers).forEach(function(key){
									if (typeof element[key] === 'string'){
										angular.merge(obj, element, (parsers[key])(element[key]));
									}
								});

								if (alreadyInside.indexOf(obj.id) < 0){
									$rootScope.elements.unshift(obj);
									newMessage = obj;
								}

								return p;
							}, $rootScope.elements);

							if ($rootScope.elements.length > MAXSIZE){
								$rootScope.elements.splice(MAXSIZE, $rootScope.elements.length - MAXSIZE);
							}

							if ($rootScope.elements.length > 0){
								$rootScope.selected = $rootScope.elements[0];
							}

							if (typeof searchObject.id === 'string'){
								$rootScope.selected = $rootScope.elements.reduce(function(p, e){
									return e.id === String(searchObject.id) ? e : p;
								}, false);
							}

							if (newMessage){
								notify(newMessage, newMessage.status + ' ' + newMessage.method + ' ' + newMessage.Host + newMessage.resource)
							}

					}, $log.error);
				}

				refresh();
				$interval(refresh, 30000);
			}
		]);
