// Manage Subscriptions js
console.log('v1');

var donatePage = function (opt) {
	let root = this;

	/**
	 * internal variables
	 */

	var translations = {
		locale: pageJson.locale,
		translatable: {
			secure: {
				'en-US': 'Secure',
				'fr-CA': 'S&#233;curis&#233;'
			},
			customError: {
				'en-US': 'This field is required.',
				'fr-CA': 'Ce champ est requis.'
			},
			header: {
				'en-US': 'Thank You',
				'fr-CA': 'Merci'
			},
			copyFrom: {
				'en-US': '',
				'fr-CA': ''
			},
			masterOptIn: {
				'en-US': '<p>Choose <strong>NO</strong> to unsubscribe from all future email communications</p>',
				'fr-CA': '<p>Choisissez <strong>NON</strong> pour vous désinscrire de toutes les communications par courriel</p>'
			}
		}
	};

	var els = {
		headerTextBlock: $('.top-a .tagline'),
		headerImageBlock: $('.hero-a'),
		optinFieldWrapper: $('.en__field--opt-in-legacy-and-new-'),
		submit: $('.en__submit button')
	};

	var settings = {
		pageNumber: pageJson.pageNumber,
		pageCount: pageJson.pageCount,
		pageId: pageJson.campaignPageId,
		pageName: pageJson.pageName,
		logPrefix: 'UNHCR donation form',
		debug: false,
		stopSubmit: false,
		emailField: 'supporter.emailAddress'
	};

	var vars = {
		headerText: '<strong>Donate today</strong> to help millions of refugees who need life-saving care.',
		headerImage: 'https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/1920/general+donation+page+banner.jpg'
	};

	/**
	 * construct function
	 */
	this.construct = function (customVars) {
		$.extend(vars, customVars);
		notice('construct called');

		if (formSetup()) {
			notice('done and ready for user');
		}
	}

	/**
	 * setup the necessary elements for the form, return false if there was a problem
	 */
	var formSetup = function () {
		notice('starting form setup');

		// functionality for all pages
		// adjust copyright year in footer
		var d = new Date();
		$('.footerYear').html(d.getFullYear());

		// save page type in body class
		if ($('form.en__component').length) {
			var formAction = $('form.en__component').attr('action');
			formAction = formAction.split('/');
			$('body').addClass(formAction[3] + '-type');
		}

		// functionality for landing pages only
		if (getPageView() == 'landing') {
			notice('setup landing page');

			// don't fire this stuff on a one-click page
			if (!isOneClick() && $('#EN__RootElement').length === 0) {

				/* show required fields as such */
				$('.en__field').each(function () {
					if ($(this).hasClass('en__mandatory')) {
						var $label = $(this).find('> .en__field__label');
						$label.html($label.html() + '<span>*</span>').addClass('required');
					}
				});
			} else { // end if not oneclick
				notice('form is oneclick');
			}

			/* adjust header text/image */
			els.headerTextBlock.html(vars.headerText);
			els.headerImageBlock.css('background-image', 'url(' + vars.headerImage + ')');

			// save image/text information in cookies
			Cookies.remove('pageInfo-' + settings.pageId, {
				domain: window.location.hostname
			});
			Cookies.set('pageInfo-' + settings.pageId, {
				src: vars.headerImage,
				txt: vars.headerText
			}, {
				domain: window.location.hostname,
				expires: 1,
				sameSite: 'strict'
			});

			// add secure text below submit button
			$('<p></p>').addClass('secure').html(translations.translatable.secure[translations.locale]).insertAfter('.en__submit');

			// change master opt-in text
			$('.en__field--90053 label p').html(translations.translatable.masterOptIn[translations.locale]);
		} // end setup for landing page

		// functionality for confirmation pages only
		if (getPageView() == 'confirmation') {
			notice('setup confirmation page');
			if (Cookies.get('pageInfo-' + settings.pageId, {
					domain: window.location.hostname
				})) {
				var pageInfo = JSON.parse(Cookies.get('pageInfo-' + settings.pageId, {
					domain: window.location.hostname
				}));
				els.headerTextBlock.html(pageInfo.txt);
				els.headerImageBlock.css('background-image', 'url(' + pageInfo.src + ')');
			}
		} // end setup for confirmation page

		return true;
	}

	/**
	 * replace checkboxes with prettier versions
	 */
	var replaceCheckboxes = function () {
		notice('update UI of checkboxes');

		$('.en__field.en__field--checkbox').each(function () {
			var thisText = $(this).find('> label').html();
			var thisEl = $(this).find('input[type="checkbox"]').attr('id');
			$('<div></div>').addClass('tick').html('<label class="fancy-label" data-for="' + thisEl + '">' + thisText + '</label>').appendTo($(this));

			$(this).find('.en__field__label').hide();
			$(this).find('.en__field__element').hide();
		});
	};

	/**
	 * called when a user clicks on a fancy checkbox to interact with it's associated, hidden checkbox
	 */
	var toggleFancyCheckbox = function (target) {
		if ($('label.fancy-label[data-for="' + target + '"]').hasClass('active')) {
			$('#' + target).click().prop('checked', true);
		} else {
			$('#' + target).click().prop('checked', false);
		}
	};

	/**
	 * return whether this is the landing page or the confirmation page
	 */
	var getPageView = function () {
		if (settings.pageNumber == 1) {
			return 'landing';
		} else if (settings.pageCount == settings.pageNumber) {
			return 'confirmation';
		} else {
			return '';
		}
	};

	/*
	 * contrib functions
	 */

	/**
	 * check if a field is empty
	 * on a few custom fields, we need to manually show an error message if it's empty
	 */
	var blankFields = function (fieldsArray, flag) {
		flag = flag || false;

		for (var i = 0; i < fieldsArray.length; i++) {
			var $thisParent = $('[name="' + fieldsArray[i] + '"]').parents('.en__field');
			removeError($thisParent);

			if (jQuery('[name="' + fieldsArray[i] + '"]').length) {
				if (mr.Test.IsEmpty(jQuery('[name="' + fieldsArray[i] + '"]').val())) {
					addCustomError(translations.translatable.customError[translations.locale], $thisParent)
					$('html, body').animate({
						scrollTop: $thisParent.offset().top
					}, 750);
					return true;
				}
			}
		}

		return false;
	};

	/**
	 * check if a field is a valid postal code for US or Canada,
	 * we need to manually show an error message
	 */
	var validPostalCode = function (postalCodeField, countryField) {
		var $thisParent = $('[name="' + postalCodeField + '"]').parents('.en__field');
		removeError($thisParent);
		if ($('[name="' + countryField + '"]').val() == "US" && !/^\d{5}$/.test($('[name="' + postalCodeField + '"]').val())) {
			addCustomError('Please enter a valid postal code. Required format: 12345', $thisParent);
			$('html, body').animate({
				scrollTop: $thisParent.offset().top
			}, 750);
			return false;
		} else if ($('[name="' + countryField + '"]').val() == "CA" && !/^[a-zA-Z]\d[a-zA-Z]\d[a-zA-Z]\d$/.test($('[name="' + postalCodeField + '"]').val())) {
			addCustomError(translations.translatable.validPostalCode[translations.locale], $thisParent);
			$('html, body').animate({
				scrollTop: $thisParent.offset().top
			}, 750);
			return false;
		}

		return true;
	};

	/**
	 * add & remove error div to a given element
	 */
	var addCustomError = function (str, el) {
		$('<div></div>').html(str).addClass('en__field__error').prependTo(el);

		el.addClass('error-wrapper');
	};

	var removeError = function ($el) {
		$el.find('.en__field__error').remove();
		$el.removeClass('error-wrapper');
	};

	/**
	 * check to see if this is a one click form
	 */
	var isOneClick = function () {
		return $('form').attr('action').indexOf('oneclick') != -1 ? true : false;
	};

	/**
	 * console.log a notice when debug is set to true
	 */
	var notice = function (msg, obj) {
		if (settings.debug == true) {
			obj = obj || '';
			console.log('%c' + settings.logPrefix + ':\n' + msg, 'color: #1968e8', obj);
		}
	}

	/**
	 * console.log an error message
	 */
	var warn = function (msg, obj) {
		obj = obj || '';
		console.error(settings.logPrefix + '\n' + msg, obj);
	}

	/**
	 * start it up
	 */
	this.construct(opt);
}

$(function () {
	var pageOpts = {};

	if (typeof headerText !== 'undefined') {
		pageOpts.headerText = headerText;
	}
	if (typeof headerImage !== 'undefined') {
		pageOpts.headerImage = headerImage;
	}

	var myDonatePage = new donatePage(pageOpts);
});
