define(['modules/jquery-mozu', 'underscore'], function($, _) {
	var pageContext = require.mozuData("pagecontext");
	var hideSearch = hideSearchBarOnMobile(pageContext);
	var isIOSMobile = isIOSMobileDevice();
	var isMobileDevice = isPhoneOrTablet();
	var isLandscapeMode = isLandscape();
	var isLandscapeAndSiteNav = isLandscapeMode && isValidWidthForSiteNav();

	function isLandscape() {
		return window.matchMedia("(orientation: landscape)").matches;
	}

	function isValidWidthForSiteNav() {
		return window.matchMedia("(min-width: 1024px)").matches;
	}

	function showSearchIcon() {
		$(".mz-searchbox-icon").css({'visibility': 'visible'});
	}

	function onPageLoad() {
		// if (hideSearch) {
		// 	showSearchIcon();
    	// }
		
		if(isMobileDevice){
			if(isLandscapeAndSiteNav){
				var $stickyHeader = $('.mz-l-pagewrapper');
				if($stickyHeader.hasClass('sticky')){
					$stickyHeader.removeClass('sticky');
				}
			}
			if(isIOSMobile && !isLandscapeAndSiteNav){
				$('.mz-l-pagewrapper').addClass('sticky');
				$('.mz-searchbox-icon').removeClass('safari-search-icon');
			}
		}
		
	}

	function isIOSMobileDevice() {
		return 	!!(/iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === "MacIntel" && typeof navigator.standalone !== "undefined"));
	}
	
	function hideSearchBarOnMobile(){
		if(pageContext && pageContext.cmsContext){
		  var pagePath = pageContext.cmsContext.template.path;
		  //Pages that need search bar displayed on mobile
		  var pathsForSearchBar = ['login', 'signup', 'order-status', 'location', 'forgot-password', 'cart', 'search-results', 'no-search-results', 'reset-password', 'my-account','Reset-Password'];
		  var isHomePage = new URL(pageContext.secureHost).pathname === new URL(pageContext.url).pathname;
		  return !(pathsForSearchBar.includes(pagePath) || isHomePage);
		}
	}

	function isPhoneOrTablet() {
		return pageContext && ((pageContext.isMobile || pageContext.isTablet) || isIOSMobile);
	}

	function hideSearchBar() {
		// if(isMobileDevice){
		//   if(hideSearch && !isLandscapeAndSiteNav){
		// 	$(".mz-searchbox-container.desktop").css({'display': 'none'});	
		//   }
		// }
	}

	function stopMobileScroll(element) {
		$(element).on("touchmove", function (event) {
			window.scrollTo(0, 0);
			event.preventDefault();
			event.stopPropagation();
		});
	}

	function searchBoxIconMobileToggle() {
		//function needs to only run on mobile/tab
		if(isMobileDevice) {
			$(window).scroll(function(){
			
				var scrollPosition = $(window).scrollTop();
				var isMobileSearchActive = $('.mz-searchbox-container.mobile').hasClass('active');
				if(isMobileSearchActive) stopMobileScroll('.mz-searchbox-container.mobile');
				if(!isLandscapeAndSiteNav){
					if(scrollPosition > 10){
						if(!isMobileSearchActive){
							toggleSearchBarAndIcon('mz-fade-out', 'mz-fade-in');
							//$(".page-container").css({"border-bottom": "1px solid #ccc"});
							$(".mz-pageheader").addClass("scroll-height");
						}
						if($('body').hasClass("mz-cart") && scrollPosition > 75)
							$(".mz-mobile-header").addClass("scrolled");
						else if(!$('body').hasClass("mz-cart"))
							$(".mz-mobile-header").addClass("scrolled");
					} else {
						if(scrollPosition === 0) {
							if(!hideSearch){
								toggleSearchBarAndIcon('mz-fade-in', 'mz-fade-out');
								$(".page-container").css({"border": "none"});
								$(".mz-pageheader").removeClass("scroll-height");
							}
							$(".mz-mobile-header").removeClass("scrolled");
						}
					}
				}
				
			});
		}
	}
	  
	function toggleSearchBarAndIcon(init, end) {
		$(".mz-searchbox-container").addClass(init);
      	$(".mz-searchbox-container").removeClass(end);
      	$(".mz-searchbox-icon").addClass(end);
      	$(".mz-searchbox-icon").removeClass(init);
	}
	
	function toggleSearchBarOnClose() {

		if ($('.mz-searchbox-container.mobile').hasClass('active')) {
			$('.mz-searchbox-container.mobile').removeClass('active');
			$('.mz-searchbox-container.mobile').addClass('deactive');
			$('mz.searchbox-container.mobile').removeClass('mz-fade-in');
			$('.mz-searchbox-container.desktop').css({'display': 'block'});
		}
		if(isMobileDevice){
			if(hideSearch && !isLandscapeAndSiteNav){
				$(".mz-searchbox-container").addClass('mz-fade-out');
				$(".mz-searchbox-container.desktop").css({'display': 'none'});	
				//$(".page-container").css({"border-bottom": "1px solid #ccc"});
				var scrollPosition = $(window).scrollTop();
				if(scrollPosition === 0) { 
					$(".mz-searchbox-container").addClass('mz-fade-in');
      				$(".mz-searchbox-container").removeClass('mz-fade-out');
				} else {
					$(".mz-searchbox-container").addClass('mz-fade-out');
      				$(".mz-searchbox-container").removeClass('mz-fade-in');
				}
			}
		}
	}
	
	function toggleSearchField(mql) {
		var isSearchBackdropActive = $('.mz-searchbackdrop').hasClass('active');
	
		if(isSearchBackdropActive){
			stopMobileScroll(".mz-searchbackdrop");
		}
		
		if(!mql.matches){
			$(".mz-searchbox-container").css({'visibility': 'visible'});
			$(".mz-searchbox-container").removeClass('mz-fade-out');
			$(".page-container").css({"border": "none"});
			hideSearchIcon();
			window.scrollTo(0,0);
		} else {
			$('.mz-searchbox-container.mobile').removeClass('mz-fade-out');
			$('.mz-searchbox-container.mobile').css({'visibility': 'visible'});

		}
	}

	function hideSearchIcon() {
		$('.mz-searchbox-icon').css({'visibility': 'hidden'});
	}

	
    return {
		hideSearchBarOnMobile: hideSearchBarOnMobile,
		hideSearchBar: hideSearchBar, 
		searchBoxIconMobileToggle: searchBoxIconMobileToggle,
		toggleSearchBarAndIcon: toggleSearchBarAndIcon,
		isIOSMobileDevice: isIOSMobileDevice,
		toggleSearchBarOnClose: toggleSearchBarOnClose,
		onPageLoad: onPageLoad,
		toggleSearchField: toggleSearchField,
    };
});