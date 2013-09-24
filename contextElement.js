/*!
 * The MIT License (MIT)
 *
 * Copyright (c) 2013 Stefan Schäfer
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Context Element
 *
 * @version 1.0
 * @author Merec (http://www.merec.org)
 */
(function($) {
	"use strict";

	/**
	 * All elements with this selector are using the context element
	 *
	 * @type {string}
	 */
	var identifier = '[data-toggle=contextElement]';
	/**
	 * All elements that are active by JavaScript manually
	 *
	 * @type {Array}
	 */
	var manual_elements = [];

	/**
	 * Constructor
	 *
	 * @param element HTMLElement
	 * @param options object
	 * @constructor
	 */
	var ContextElement = function(element, options) {
		var $this = this;
		this.element = $(element);
		this.options = $.extend({}, ContextElement.DEFAULTS, options);

		// Pass data-attributes to options
		if(this.element.attr('data-target')) this.options.target = $(this.element.attr('data-target'));
		if(this.element.attr('data-source')) this.options.target = $(this.element.attr('data-source'));
		if(this.element.attr('data-sourceLoadingText')) this.options.target = $(this.element.attr('data-source'));
		if(this.element.attr('data-displayTimeout')) this.options.displayTimeout = parseInt(this.element.attr('data-displayTimeout'));
		if(this.element.attr('data-mouseOutTimeout')) this.options.mouseOutTimeout = parseInt(this.element.attr('data-mouseOutTimeout'));
		if(this.element.attr('data-modal')) this.options.cursorMargin = !!($.inArray([true, 1, 'on', 'true'], this.element.attr('data-modal')) !== false);
		if(this.element.attr('data-cursorMargin')) this.options.cursorMargin = parseInt(this.element.attr('data-cursorMargin'));
		if(this.element.attr('data-leftClick')) this.options.leftClick = !!($.inArray([true, 1, 'on', 'true'], this.element.attr('data-leftClick')) !== false);
		if(this.element.attr('data-middleClick')) this.options.middleClick = !!($.inArray([true, 1, 'on', 'true'], this.element.attr('data-middleClick')) !== false);
		if(this.element.attr('data-rightClick')) this.options.rightClick = !!($.inArray([true, 1, 'on', 'true'], this.element.attr('data-rightClick')) !== false);
		if(this.element.attr('data-effect')) this.options.effect = this.element.attr('data-effect');
		if(this.element.attr('data-effectDuration')) this.options.effectDuration = parseInt(this.element.attr('data-effectDuration'));

		// Disable displayTimeout and mouseOutTimeout if modal
		if(this.options.modal) {
			this.options.displayTimeout = 0;
			this.options.mouseOutTimeout = 0;
		}

		// Debug
		this.debug = false;
		this.debugOnlyConsole = true;

		// Internal variables
		this.target = null;
		this.targetPrepared = false;
		this.sourceIsLoading = false;
		this.gotTargetFromSource = false;
		this.displayContextElement = false;
		this.isTouchDevice = 'ontouchstart' in document.documentElement;

		// Timer
		this.displayTimeoutTimer = null;
		this.mouseOutTimeoutTimer = null;
		this.touchDisplayContextElementTimer = true;

		// Don't show the browsers context element if rightClick is enabled
		if(this.options.rightClick) {
			this.element.on('contextmenu', function(e) {
				e.preventDefault();
			});
		}

		// If source is given, set target to a div and append the content there
		if(this.options.source != null) {
			/*
			 this.target = $('<div></div>').css({
			 display: 'none',
			 position: 'absolute'
			 });
			 $(document.body).append(this.target);
			 */
		}
	};

	/**
	 * Default options
	 *
	 * @type {{target: null, source: null, sourceLoadingText: string, displayTimeout: number, mouseOutTimeout: number, modal: boolean, cursorMargin: number, leftClick: boolean, middleClick: boolean, rightClick: boolean, effect: string, effectDuration: number, touch: {cursorMargin: number, displayAfterTime: number, displayTimeout: number}, ajax: {}, events: {beforeDisplay: string, onDisplay: string, beforeHide: string, onHidden: string, sourceLoading: string, sourceLoaded: string}}}
	 */
	ContextElement.DEFAULTS = {
		target: null,
		source: null,
		sourceLoadingText: "Loading ...",
		displayTimeout: 2500,
		mouseOutTimeout: 300,
		modal: false,
		cursorMargin: 5,
		leftClick: false,
		middleClick: false,
		rightClick: true,
		effect: 'fade',
		effectDuration: 150,
		touch: {
			cursorMargin: 20, // Large finger....
			displayAfterTime: 500,
			displayTimeout: 0
		},
		ajax: {
		},

		// Events
		events: {
			beforeDisplay: 'beforeDisplay.bs.contextElement',
			onDisplay: 'onDisplay.bs.contextElement',
			beforeHide: 'beforeHide.bs.contextElement',
			onHidden: 'onHidden.bs.contextElement',
			sourceLoading: 'sourceLoading.bs.contextElement',
			sourceLoaded: 'sourceLoaded.bs.contextElement'
		}
	};

	/**
	 * Debug something, mostly used for touch testing
	 *
	 * @param message string
	 */
	ContextElement.prototype.debugMessage = function(message) {
		if(!this.debug) return;
		if(!this.debugOnlyConsole) {
			this.element.html(this.element.html() + message + "<br />");
		}
		console.log(message);
	};

	/**
	 * Prepares the target that will be displayed. Loads source if set.
	 *
	 * @param e Event
	 * @returns {boolean}
	 */
	ContextElement.prototype.prepareTarget = function(e) {
		if(this.targetPrepared) return true;
		var $this = this;

		// We need to get the target from source
		if(this.options.source) {
			if(typeof this.options.source == "string" && !this.gotTargetFromSource) {
				if(this.sourceIsLoading) return false;

				// We will now load the source
				this.sourceIsLoading = true;

				// Fire sourceLoad
				var loadingPlaceholder = (typeof this.options.sourceLoadingText == "function ") ? this.options.sourceLoadingText() : this.options.sourceLoadingText;
				if(loadingPlaceholder) {
					var displayTimeoutBackup = this.options.displayTimeout;
					var touchDisplayTimeoutBackup = this.options.touch.displayTimeout;
					this.options.displayTimeout = 0;
					this.options.touch.displayTimeout = 0;

					// Set the content
					var newContent = $('<div></div>').css({display: 'none', position: 'absolute'}).html(loadingPlaceholder);
					if(!this.target || this.target.length == 0) $(document.body).append(newContent);
					else this.target.replaceWith(newContent);
					this.target = newContent;
					this.display();
				}

				// Trigger sourceLoading
				this.element.trigger(this.options.events.sourceLoading);
				// Load via ajax
				$.ajax(this.options.source, this.options.ajax).done(function(response) {
					// Reset the loadingPlaceholder nd restore display timeouts
					$this.options.displayTimeout = displayTimeoutBackup;
					$this.options.touch.displayTimeout = touchDisplayTimeoutBackup;
					$this.targetIsSourceLoading = false;

					// Set the new content
					var newContent = $(response);
					$this.target.replaceWith(newContent);
					$this.target = newContent;

					$this.gotTargetFromSource = true;
					$this.sourceIsLoading = false;

					// Trigger sourceLoaded
					$this.element.trigger($this.options.events.sourceLoaded);

					// Show the source
					$this.show(e);
				});

				return false;
			}
			else if(typeof this.options.source == "function") {
				// Create a container
				var newContent = $('<div></div>').css({display: 'none', position: 'absolute'}).html(this.options.source());
				if(this.target && this.target.length > 0) {
					this.target.replaceWith(newContent);
				}
				this.target = newContent;
			}

			// If this is called with this.gotTargetFromSource=true then set it to false, so it will be loaded next time again
			this.gotTargetFromSource = false;
		}
		else {
			this.target = $(this.options.target);
		}

		// Set the target absolute, hide it and move it to body
		this.target.css({
			'position': 'absolute',
			'display': 'none'
		});
		$(document.body).append(this.target);

		// Add some events to the target
		this.target.hover(function() {
			// Clear all timer when hovering the contextElement
			if($this.displayTimeoutTimer != null) {
				window.clearTimeout($this.displayTimeoutTimer);
				$this.displayTimeoutTimer = null;
			}
			if($this.mouseOutTimeoutTimer != null) {
				window.clearTimeout($this.mouseOutTimeoutTimer);
				$this.mouseOutTimeoutTimer = null;
			}
		}, function() {
			// Start the mouseOutTimeoutTimer on mouseout and hide the contextElement
			if($this.options.mouseOutTimeout > 0) {
				$this.mouseOutTimeoutTimer = window.setTimeout(function() {
					$this.element.contextElement('hide');
				}, $this.options.mouseOutTimeout);
			}
		});

		if(!this.options.source) {
			this.targetPrepared = true;
		}

		return true;
	};

	/**
	 * Show the context element. Redirects to showTouch if its a touch device.
	 *
	 * @param e Event
	 */
	ContextElement.prototype.show = function(e) {
		var $this = this;

		//Check if this is on touch devices
		if(this.isTouchDevice) {
			this.showTouch(e);
			return;
		}

		// This is a two step method
		// first is mousedown, but we want the contextElement on mouseup

		// Handle mousedown
		if(e.type == 'mousedown') {
			// Check if the right button is clicked
			if(e.which == 1 && !this.options.leftClick) return;
			if(e.which == 2 && !this.options.middleClick) return;
			if(e.which == 3 && !this.options.rightClick) return;
			this.displayContextElement = true;
			return;
		}

		// Now ne are in mouseup
		// Check if displayContextElement is valid
		if(!this.displayContextElement) return;

		// Set the current position
		this.lastPointsToDisplayAt = {x: e.pageX, y: e.pageY};

		// Prepare the target
		if(!this.prepareTarget(e)) {
			// Target is not ready, maybe it loaded via ajax
			return;
		}

		// Yes we want to show it, reset the indicator
		this.displayContextElement = false;

		// Show it!
		// Get the position and do display
		this.display();
	};

	/**
	 * Show the context element on a touch device
	 *
	 * @param e Event
	 */
	ContextElement.prototype.showTouch = function(e) {
		var $this = this;

		// Special cases for touch devices
		if(e.type == 'touchstart') {
			// Set the position, because position is only set on touchstart
			this.lastPointsToDisplayAt = {x: e.originalEvent.touches[0].pageX, y: e.originalEvent.touches[0].pageY};

			if(this.options.touch.displayAfterTime) {
				this.touchDisplayContextElementTimer = window.setTimeout(function() {
					$this.displayContextElement = true;
					$this.touchDisplayContextElementTimer = null;
				}, this.options.touch.displayAfterTime);
				return;
			}
		}

		if(this.touchDisplayContextElementTimer != null) {
			window.clearTimeout(this.touchDisplayContextElementTimer);
			this.touchDisplayContextElementTimer = null;
		}

		// Check if we want to display the context element at this point
		if(!this.displayContextElement) {
			return;
		}

		// Reset
		this.displayContextElement = false;

		// Get the position and do display
		this.display();
	};

	/**
	 * Handle touchmove event
	 *
	 * @param e Event
	 */
	ContextElement.prototype.touchmove = function(e) {
		// Normally when moving while touching, the user wants to scroll
		if(this.touchDisplayContextElementTimer != null) {
			window.clearTimeout(this.touchDisplayContextElementTimer);
			this.touchDisplayContextElementTimer = null;
		}
	};

	/**
	 * Displays this.target at the position
	 *
	 * @param x
	 * @param y
	 */
	ContextElement.prototype.display = function(x, y) {
		if(!x && this.lastPointsToDisplayAt.x) {
			x = this.lastPointsToDisplayAt.x;
		}
		else {
			throw "No position X given";
		}
		if(!y && this.lastPointsToDisplayAt.y) {
			y = this.lastPointsToDisplayAt.y;
		}
		else {
			throw "No position Y given";
		}

		var $this = this;
		if(!this.target || this.target.length == 0) return;

		// Fire beforeDisplay
		if(!this.sourceIsLoading) {
			this.element.trigger(this.options.events.beforeDisplay);
		}

		// Margin of the element
		var margin = (this.isTouchDevice) ? this.options.touch.cursorMargin : this.options.cursorMargin;

		// Set the position next to cursor
		this.target.css({
			'left': x + margin,
			'top': y + margin
		});

		// Set the effect
		if(this.options.effect == 'slide') {
			this.target.finish().slideDown(this.options.effectDuration);
		}
		else if(this.options.effect == 'fade') {
			this.target.finish().fadeIn(this.options.effectDuration);
		}
		else {
			this.target.finish().show();
		}

		// Check if the element might need to set to left
		var x_plus_width = x + this.target.outerWidth() + margin;
		if($(window).innerWidth() < x_plus_width) {
			// Move to left
			this.target.css('left', x - this.target.outerWidth() - margin)
		}

		// Check if the element might need to set to top
		var y_plus_height = y + this.target.outerHeight() + margin;
		if($(window).innerHeight() + $(window).scrollTop() < y_plus_height) {
			// Move to left
			this.target.css('top', y - this.target.outerHeight() - margin)
		}

		// Fire onDisplay
		if(!this.sourceIsLoading) {
			this.element.trigger(this.options.events.onDisplay);
		}

		// Lets start the timer until the user hover the popped up element
		if(this.isTouchDevice) {
			if(this.options.touch.displayTimeout > 0) {
				this.displayTimeoutTimer = window.setTimeout(function() {
					// Hide the element
					$this.hide();
				}, this.options.touch.displayTimeout);
			}
		}
		else {
			if(this.options.displayTimeout > 0) {
				this.displayTimeoutTimer = window.setTimeout(function() {
					// Hide the element
					$this.hide();
				}, this.options.displayTimeout);
			}
		}
	};

	/**
	 * Hides the context element
	 */
	ContextElement.prototype.hide = function() {
		if(!this.target) return;

		// Fire beforeHide
		this.element.trigger(this.options.events.beforeHide);

		// Hide the contextElement
		if(this.options.effect == 'slide') {
			this.target.stop().slideUp(this.options.effectDuration);
		}
		else if(this.options.effect == 'fade') {
			this.target.stop().fadeOut(this.options.effectDuration);
		}
		else {
			this.target.stop().hide();
		}

		// Reset all Timers
		if(this.displayTimeoutTimer != null) {
			window.clearTimeout(this.displayTimeoutTimer);
			this.displayTimeoutTimer = null;
		}
		if(this.mouseOutTimeoutTimer != null) {
			window.clearTimeout(this.mouseOutTimeoutTimer);
			this.mouseOutTimeoutTimer = null;
		}

		// Fire onHidden
		this.element.trigger(this.options.events.onHidden);
	};

	/**
	 * Hides the element only if it's not a modal one
	 */
	ContextElement.prototype.hideIfNotModal = function() {
		if(!this.options.modal) {
			this.hide();
		}
	};

	/**
	 * Close all ContextElements when click somewhere
	 */
	function closeContextElements(e) {
		$(identifier).each(function() {
			$(this).contextElement('hideIfNotModal', e);
		});
		$(manual_elements).each(function() {
			$(this).contextElement('hideIfNotModal', e);
		});
	}

	// CONTEXT PLUGIN DEFINITION
	// ==========================

	var old = $.fn.contextElement;

	$.fn.contextElement = function(option, e) {
		return this.each(function() {
			var $this = $(this);
			var data = $this.data('bs.contextElement');
			var options = $.extend({}, ContextElement.DEFAULTS, $this.data(), typeof option == 'object' && option);

			if(!data) $this.data('bs.contextElement', (data = new ContextElement(this, options)));
			if(typeof option == 'string') data[option](e);

			if(!e) {
				// This is initialized via JavaScript
				$this.on('mousedown.bs.contextElement.data-api',function(e) {
					$(this).contextElement('show', e);
				}).on('mouseup.bs.contextElement.data-api', function(e) {
						$(this).contextElement('show', e);
					});
				manual_elements.push($this);
			}
		});
	};

	$.fn.contextElement.Constructor = ContextElement;

	// CONTEXT NO CONFLICT
	// ====================

	$.fn.contextElement.noConflict = function() {
		$.fn.contextElement = old;
		return this;
	};

	// APPLY TO STANDARD CONTEXT ELEMENTS
	// ===================================

	$(document).on('mousedown.bs.contextElement.data-api', closeContextElements).on('mousedown.bs.contextElement.data-api', identifier, function(e) {
		$(this).contextElement('show', e);
	}).on('mouseup.bs.contextElement.data-api', identifier, function(e) {
			$(this).contextElement('show', e);
		}).on('touchstart.bs.contextElement.data-api', identifier, function(e) {
			$(this).contextElement('show', e);
		}).on('touchend.bs.contextElement.data-api', identifier, function(e) {
			$(this).contextElement('show', e);
		}).on('touchmove.bs.contextElement.data-api', identifier, function(e) {
			$(this).contextElement('touchmove', e);
		});

})(window.jQuery);