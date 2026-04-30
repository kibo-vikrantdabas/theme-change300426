define([ 
  "modules/jquery-mozu", 
  "underscore", 
  "modules/mobile-sticky-header", 
  'modules/analytics/login-event',
  'modules/analytics/countrySelectorGA',
  "modules/hamburger-menu",
  "modules/mobile-checker",
  "modules/country-selector",
  "modules/wishlist-count-handler",
  "modules/analytics/flyoutGA",
   ], function (
    $,
    _,
    StickyHeader, 
    loginEvent,
    CountrySelectorGAHandler,
    MobileMenu, 
    MobileChecker,
    CountrySelector,
    WishlistCountHandler,
    FlyOutGAHandler
  ) {
    
    var setMetaOgTitle = function() {
      var titleText = $("title").text().replace(/\n|\r|\t/g, "");
      $("meta[property='og:title']").attr('content',titleText);
    };

    function hamburgerMenuHandler() {
      MobileMenu.displayHideHamhurgMenu();
      MobileMenu.handleTabletSiteNavMenu();

      if (MobileChecker.isPhoneOrTablet() || MobileChecker.isIOSMobileDevice()) {
        MobileMenu.openParentCategory();
        MobileMenu.closeParentCategory();
        MobileMenu.openThirdLevelCategory();
        MobileMenu.hideThirdLevelCategory();
        MobileMenu.closeMenuInOpenCategory();
        MobileMenu.disableMobileScrolling();
      }
    }

    function CountrySelectorHandler() {
      CountrySelector.displayCountryDropdown();
      CountrySelector.displayCountrySelectorPopup();
      CountrySelector.siteChangeButton();
      CountrySelector.siteChangeMobileButton();
      CountrySelector.onCountrySelection();
      CountrySelector.onMobileCountrySelection();
      CountrySelector.onLanguageSelection();
      CountrySelector.onMobileLanguageSelection();
   }

    $(document).ready(function () {
      //  $(".mz-searchbox-container.desktop").css({ display: "block" });
      StickyHeader.onPageLoad();
      StickyHeader.hideSearchBar();
      StickyHeader.searchBoxIconMobileToggle();

      $(".mz-sitenav .mz-sitenav-item").on('mouseenter',function(){
        $('select:focus').blur();
        $(".mz-order-time-dropdown .arrowanim").trigger("click");
      }); 

      FlyOutGAHandler.init();
      hamburgerMenuHandler();
      CountrySelectorHandler();

      WishlistCountHandler.wishlistCountHandler();

      loginEvent.userLogin();
      CountrySelectorGAHandler.init();
      setMetaOgTitle();
    });
});
  