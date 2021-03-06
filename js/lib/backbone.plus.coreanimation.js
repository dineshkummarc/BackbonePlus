/*
 * Backbone.CoreAnimation v0.1
 * Copyright 2012, Jason Kadrmas (@itooamaneatguy)
 * License: MIT
 */

(function (Backbone, _) {

	"use strict";

	var tick, tickID, FPS = 50, frame = 1, isAnimating = false,

		onFrame = window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				window.oRequestAnimationFrame ||
				window.msRequestAnimationFrame ||
				null;

	var CoreAnimation = function() {
		this.listeners = [];
	};

	_.extend(CoreAnimation.prototype, Backbone.Events, {
		
		events: {
			CORE_ANIMATION_STOP: "CoreAnimation:stop",
			CORE_ANIMATION_FRAME: "CoreAnimation:frame"
		},

		initialize: function() {

			var _self = this;

			_.bindAll(this);

			// Reset frame
			frame = 1;
			isAnimating = true;

			if (onFrame) {
				tick = function () {
					
					if(tick) {
						tickID = onFrame(tick);
						_self.step();
					}
				};

				tick();
			} else {
				tick = setInterval(this.step, 1000 / FPS);
			}

		},

		stop: function () {
			isAnimating = false;
			
			if (typeof tick === "number") clearInterval(tick);

			var onFrame = window.cancelRequestAnimationFrame ||
				window.webkitCancelRequestAnimationFrame ||
				window.mozCancelRequestAnimationFrame ||
				window.oCancelRequestAnimationFrame ||
				window.msCancelRequestAnimationFrame ||
				null;

			if (onFrame) onFrame(tickID);
			tick = null;

			// Remove all callbacks on this object
			this.off();

			// Tell everyone about it
			this.trigger(this.events.CORE_ANIMATION_STOP);
		},

		step: function () {
		
			// No one is listening, shut er down.
			if(!this.listeners.length) {
				this.stop();
				return;
			}

			console.log("CORE :: ANIM :: STEP");
			this.trigger(this.events.CORE_ANIMATION_FRAME, { frame: frame++ });
		},

		registerListener: function( key ) {

			console.log("CORE :: REGISTER LISTENER :: " + key);
			this.listeners.push(key);

			if( !isAnimating ) {
				this.initialize();
			}
		},

		removeListener: function( key ) {

			console.log("CORE :: REMOVE LISTENER :: " + key);

			var i = _.indexOf(this.listeners, key );
			this.listeners.splice( i, 1 );

			console.log("CORE :: LISTENERS :: " + this.listeners);
		}

	});

	Backbone.CoreAnimation = new CoreAnimation();
	
})(this.Backbone, this._);


(function (Backbone, _) {

	"use strict";

	var Core = Backbone.CoreAnimation;

	/* ======================================================
	* Backbone.Animation v0.1
	* Copyright 2012, Jason Kadrmas (@itooamaneatguy)
	* License: MIT
	* ====================================================== */

	Backbone.Animation = function() {
		this.tweens = [];
		this.map = [];
	};

	_.extend(Backbone.Animation.prototype, Backbone.Events, {

		tween: function(args) {
			return this.addTween(this, args);
		},

		delay: function(args) {
			return this.addTween(null, args);
		},

		timer: function() {
			
			var args = {
				autoStart: false,
				duration: -1
			};

			return this.addTween(null, args);
		},

		addTween: function(obj, args) {

			var tween = new Backbone.Tween(obj, args),
				_self = this;

			tween.on(tween.events.TWEEN_COMPLETE, function() {
				_self.removeTween(tween);
			});

			this.tweens.push(tween);

			return tween;
		},

		removeTween: function(tween) {
			
			tween.stop();

			var i = _.indexOf(this.tweens, tween);
			this.tweens.splice( i, 1 );
		},

		removeAllTweens: function() {

			for( var i = 0, len = this.tweens.length; i < len; i++ ) {
				this.tweens[i].stop();
			}

			this.tweens.length  = 0;
		}

	});

	/* ======================================================
	* Backbone.Tween v0.1
	* Copyright 2012, Jason Kadrmas (@itooamaneatguy)
	* License: MIT
	* ====================================================== */

	Backbone.Tween = function(obj, args) {
	
		// Element & ID
		this.tid = _.uniqueId('tween_');
		this.obj = obj;

		// Where are we going?
		this.to = args.to || {};

		// Set internal property values to keep track of progress
		this._currentValues = {};
		this._startValues = {};

		// Timing
		this.startTime = null;
		this.elapsed = 0;
		this.elapsedTime = 0;
		this.delay = args.delay || 0;
		this.delta = 0;
		this.duration = args.duration || 1000;
		this.easing = args.easing || Backbone.Easing.Linear.EaseNone;
		this.autoStart = args.autoStart;

		// Callbacks
		this.progress = args.progress || null;
		this.callback = args.complete || null;

		if(this.autoStart === true || this.autoStart === undefined) {
			this.start();
		}
	};

	_.extend(Backbone.Tween.prototype, Backbone.Events, {

		events: {
			TWEEN_COMPLETE: 'Backbone.Tween:complete'
		},

		listen: function() {
			
			this.listening = true;

			Core.registerListener( this.tid );
			Core.on(Core.events.CORE_ANIMATION_FRAME, this.step, this);
		},

		stopListening: function() {
			
			console.log("STOP LISTENER :: " + this.tid);

			this.listening = false;
			
			Core.off(Core.events.CORE_ANIMATION_FRAME, this.step, this);
			Core.removeListener( this.tid );
		},


		start: function() {
			var _to = this.to,
				_object = this.obj,
				property;

			this.startTime = Date.now() + this.delay;

			if(_object) {
				for ( property in _to ) {

					// Again, prevent dealing with null values
					if ( _object[ property ] === null ) {
						continue;
					}

					this._startValues[ property ] = _object[ property ];
					this._currentValues[ property ] = _to[ property ] - _object[ property ];

				}
			}

			this.listen();

			return this;
		},

		resume: function(elapsedTime) {

            this.elapsedTime = elapsedTime || this.elapsedTime;

			if(this.startTime !== null) {
				this.delta = this.elapsedTime;
				this.startTime = Date.now();
				this.listen();
			} else {
				this.start();
			}
			
			return this;
		},

		stop: function() {
			console.log("CORE :: STOP TWEEN");
			this.elapsedTime = Date.now() - this.startTime + this.delta;
			this.stopListening();

			return this;
		},

		getElapsedTime: function() {
			return this.elapsedTime;
		},

		step: function() {

			var current = Date.now(),
				delta = current - this.startTime + this.delta,
				value,
				_currentValues = this._currentValues,
				_startValues = this._startValues,
				property;

			if ( current < this.startTime ) {
				// Something is not right
				return false;
			}

			// Set elapsed time
			this.elapsedTime = delta;
			
			// Duration is infinite
			if(this.duration !== -1) {
				this.elapsed = delta / this.duration;

				// Elapsed can't be greater than 1.
				this.elapsed = this.elapsed > 1 ? 1 : this.elapsed;
				value = this.easing( this.elapsed );
			} else {
				value = delta;
			}

			// Actually update our values and redraw
			if(this.obj) {
				
				for ( property in _currentValues ) {
					this.obj[ property ] = _startValues[ property ] + _currentValues[ property ] * value;
				}

				this.obj.draw();
			}

			// Update progress
			if ( this.progress ) {
				this.progress.call( this.obj, value );
			}

			// We are done. Fire callbacks, etc.
			if ( this.elapsed == 1 ) {

				// Stop listening to our loop
				this.stopListening();

				// Do callback
				if ( this.callback ) {
					this.callback.call( this.obj );
					this.trigger(this.events.TWEEN_COMPLETE);
				}
			}
		}

	});

})(this.Backbone, this._);