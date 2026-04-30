define(['modules/jquery-mozu', 'underscore'], function($, _) {
	var pageContext = require.mozuData("pagecontext");
	var isIOSMobile = isIOSMobileDevice();

	function isIOSMobileDevice() {
		return 	!!(/iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === "MacIntel" && typeof navigator.standalone !== "undefined"));
	}

	function isPhoneOrTablet() {
		return pageContext && ((pageContext.isMobile || pageContext.isTablet) || isIOSMobile);
	}

    return {
		isIOSMobileDevice: isIOSMobileDevice,
		isPhoneOrTablet: isPhoneOrTablet
    };
});