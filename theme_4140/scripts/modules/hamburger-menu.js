define([
    'modules/jquery-mozu', 
    'underscore', 
    'modules/country-selector', 
    'modules/mobile-checker',
    'modules/backdrop' ], function($, _, CountrySelector, MobileChecker, BackdropHandler) {

    
    var displayHideFixedMenuFooter = function (addedClass, removedClass) {
        $(".mz-hamburgmenu-fixed-container").addClass(addedClass).removeClass(removedClass);
        $(".mz-menu-footer + .mz-seprator").addClass(addedClass).removeClass(removedClass);
    };

    var displayHideBorder = function (addedClass, removedClass) {
        $(".mz-mobile-parent-category-container.mz-border").addClass(addedClass).removeClass(removedClass);
    };

    var closeThirdLevelCategory = function (index) {
        $(".mz-sitenav-item-mobile").eq(index).find(".mz-sitenav-sub-container-mobile .mz-sitenav-item .mz-sitenav-sub-sub.active")
        .addClass("deactive").removeClass("active");
    
        $(".mz-sitenav-item-mobile").eq(index).find(".mz-sitenav-sub-container-mobile .mz-sitenav-item .mz-l-two-arrow-expand.deactive")
        .addClass("active").removeClass("deactive");
    
        $(".mz-sitenav-item-mobile").eq(index).find(".mz-sitenav-sub-container-mobile .mz-sitenav-item .mz-l-two-arrow-collapse.active")
        .addClass("deactive").removeClass("active");
        
        $(".mz-sitenav-item-mobile").eq(index).find(".mz-sitenav-sub-container-mobile .mz-sitenav-item .mz-sitenav-sub-sub.active")
        .parent().removeClass('afg-active');
      
    };

    var closeLOneFooterMenu = function (index) {
        $(".mz-parent-category-right-arrow").eq(index).addClass("active").removeClass("deactive");
    
        $(".mz-sitenav-item-mobile").eq(index).find(".mz-sitenav-link-mobile").removeClass("align-center");
    
        $(".mz-sitenav-item-mobile").eq(index).find(".mz-parent-category-left-arrow").addClass("deactive").removeClass("active");
    
        $(".mz-sitenav-item-mobile").eq(index).find(".mz-sitenav-sub-container-mobile").addClass("deactive").removeClass("active");
    
        $(".mz-sitenav-item-mobile").not($(".mz-sitenav-item-mobile").eq(index)).addClass("active").removeClass("deactive");
    
        // $(".mz-menu-header").addClass("active").removeClass("deactive");
    
        $(".mz-sitenav-item-mobile").eq(index).find(".mz-close-category-icon").addClass("deactive").removeClass("active");
    
        $(".mz-sitenav-item-mobile").eq(index).removeClass("no-border");
    
        $(".mz-account-section").addClass("active").removeClass("deactive");
    
        closeThirdLevelCategory(index);
        displayHideFixedMenuFooter("active", "deactive");
        displayHideBorder("deactive", "active");
        CountrySelector.displayCountrySelector("active", "deactive");
      };

    var openParentCategory = function () {
        $.map($(".mz-parent-category-right-arrow"), function (value, index) {
          $(value).on("click", function () {
              if($(".mz-parent-category-right-arrow").eq(index).hasClass("no-child")) {
                  return ;
              }

              $(".mz-parent-category-right-arrow").eq(index).addClass("deactive").removeClass("active");
  
              $(".mz-sitenav-item-mobile").eq(index).find('.mz-sitenav-item-inner-mobile-header').addClass('active-header');
    
              $(".mz-sitenav-item-mobile").eq(index).find(".mz-sitenav-link-mobile").addClass("align-center");
    
              $(".mz-sitenav-item-mobile").eq(index).find(".mz-parent-category-left-arrow").addClass("active").removeClass("deactive");
    
              $(".mz-sitenav-item-mobile").eq(index).find(".mz-sitenav-sub-container-mobile").addClass("active").removeClass("deactive");
    
            $(".mz-sitenav-item-mobile").not($(".mz-sitenav-item-mobile").eq(index)).addClass("deactive").removeClass("active");
    
            // $(".mz-menu-header").addClass("deactive").removeClass("active");
              
            $(".mz-sitenav-item-mobile").eq(index).find(".mz-close-category-icon").addClass("active").removeClass("deactive");
    
            $(".mz-sitenav-item-mobile").eq(index).addClass("no-border");
    
            $(".mz-account-section").addClass("deactive").removeClass("active");
            
    
            displayHideFixedMenuFooter("deactive", "active");
            displayHideBorder("active", "deactive");
            CountrySelector.displayCountrySelector("deactive", "active");
          });
        });
    };

    var closeParentCategory = function () {
        $.map($(".mz-parent-category-left-arrow"), function (value, index) {
          $(value).on("click", function () {
            $('.mz-sitenav-item-inner-mobile-header').removeClass('active-header');
  
            closeLOneFooterMenu(index);
          });
        });
    };

    var openThirdLevelCategory = function () {
        $.map($(".mz-l-two-arrow-expand"), function (value, index) {
            $(value).on("click", function () {

                $(".mz-l-two-arrow-expand").eq(index).addClass("deactive").removeClass("active");
        
                $.map($(".mz-l-two-arrow-collapse"), function (collapseArrow, collapseArrowIndex) {
                    if ($(collapseArrow).hasClass("active")) {
                        if (collapseArrowIndex != index) {
                            $(collapseArrow).addClass("deactive").removeClass("active");
                            $(".mz-l-two-arrow-expand").eq(collapseArrowIndex).addClass("active").removeClass("deactive");
                        }
                    }
                });
        
                $(".mz-l-two-arrow-collapse").eq(index).addClass("active").removeClass("deactive");
        
                $(".mz-sitenav-sub-sub").eq(index).addClass("active").removeClass("deactive");
        
                $(".mz-sitenav-sub-sub").not($(".mz-sitenav-sub-sub").eq(index)).addClass("deactive").removeClass("active");
    
                $('.mz-sitenav-sub-sub').eq(index).parent().addClass('afg-active');

                $('.mz-sitenav-sub-sub').not($(".mz-sitenav-sub-sub").eq(index)).parent().removeClass('afg-active');

            });
        });
    };

    var hideThirdLevelCategory = function () {
        $.map($(".mz-l-two-arrow-collapse"), function (value, index) {
            $(value).on("click", function () {
                $(".mz-l-two-arrow-expand").eq(index).addClass("active").removeClass("deactive");
        
                $(".mz-l-two-arrow-collapse").eq(index).addClass("deactive").removeClass("active");
        
                $(".mz-sitenav-sub-sub").addClass("deactive").removeClass("active");
                $('.mz-sitenav-sub-sub').parent().removeClass('afg-active');
            });
        });
    };

    var closeMenuInOpenCategory = function () {
        $.map($(".mz-close-category-icon"), function (value, index) {
          $(value).on("click", function () {

            $(".mz-close-category-icon").eq(index).addClass("deactive").removeClass("active");
            $(".mz-sitenav-item-mobile").eq(index).removeClass("no-border");
    
            closeThirdLevelCategory(index);
    
            $.map($(".mz-sitenav-item-mobile"), function (innervalue, innerindex) {
              $(".mz-sitenav-item-mobile").eq(innerindex).addClass("active").removeClass("deactive");
            });
    
            $(".mz-parent-category-right-arrow").eq(index).addClass("active").removeClass("deactive");
    
            $(".mz-sitenav-link-mobile").eq(index).removeClass("align-center");
    
            $(".mz-parent-category-left-arrow").eq(index).addClass("deactive").removeClass("active");
    
            $(".mz-sitenav-sub-container-mobile").eq(index).addClass("deactive").removeClass("active");
    
            // $(".mz-menu-header").addClass("active").removeClass("deactive");
    
            $(".mz-account-section").addClass("active").removeClass("deactive");
    
            $(".mz-hamburgmenu-option-container").hide();
            displayHideFixedMenuFooter("deactive", "active");
            displayHideBorder("deactive", "active");
            CountrySelector.displayCountrySelector("deactive", "active");
            BackdropHandler.applyRemoveBackdrop("deactive", "active");
          });
        });
    };

    var disableMobileScrolling = function () {
        $(".mz-backdrop").on("touchmove", function (event) {
            window.scrollTo(0, 0);
            event.preventDefault();
            event.stopPropagation();
        });
    };

    var displayHideHamhurgMenu = function () {
        var checkHeightFlag = false;
        $(".mz-hamburgmenu-container").on("click", function () {
          $(".mz-l-pagewrapper").removeClass('sticky');
          window.scrollTo(0,0);
          $(".mz-hamburgmenu-option-container").show();
          displayHideFixedMenuFooter("active", "deactive");
          CountrySelector.displayCountrySelector("active", "deactive");
          BackdropHandler.applyRemoveBackdrop("active", "deactive");
          $('body').css("overflow","hidden");
  
          $('body').css("position","fixed");
          $('.homeCarousel-wrapper').addClass("hamMarginCheck");
          if($(window).innerHeight() == 664 && $(window).innerWidth() == 390){
            $('.mz-hamburgmenu-fixed-container').addClass("iphone13andpro");
            checkHeightFlag = true;
          }
  
        });
        $(".mz-backdrop, .mz-menu-close-icon").on("click", function () {
            $(".mz-l-pagewrapper").addClass('sticky');
            if (window.matchMedia("screen and (min-width: 1024px) and (max-width: 1180px")) {
                if ($(".mz-free-delivery-popover-container")) $(".mz-free-delivery-popover-container").animate({ right: "-100%" },"slow");
                // this got removed earlier
                if ($(".mz-wishlist-popover-container")) $(".mz-wishlist-popover-container").animate({right: "-100%" }, "slow");
            }

            $('.pdp-find-in-store-container').addClass("deactive").removeClass("active");
            $('.mz-backdrop').addClass("deactive").removeClass("active");
            $('.mz-backdrop').removeProp("style");
            $(".mz-product").css("overflow", "auto");
            $('.mz-l-pagecontent').css("overflow","auto");
            $('body').css("overflow","auto");
            $(".mz-hamburgmenu-option-container").hide();
            
            displayHideFixedMenuFooter("deactive", "active");
            CountrySelector.displayCountrySelector("deactive", "active");
            BackdropHandler.applyRemoveBackdrop("deactive", "active");

            $(".mz-menu-country-dropdown-selector").addClass("deactive").removeClass("is-active");
            $(".mz-country-selector-popover-container").addClass("deactive").removeClass("active");
    
            $('body').css("position","");
            $('.homeCarousel-wrapper').removeClass("hamMarginCheck");
            
            if(checkHeightFlag) $('.mz-hamburgmenu-fixed-container').removeClass("iphone13andpro");
    
            });
            $(".mz-backdrop").on("click", function () {
            var activeCategory = $(".mz-mobile-sitenav-list").find(".mz-sitenav-item-mobile.active"),
                index = $(activeCategory).index();

            closeLOneFooterMenu(index);
            });
    };

    var handleTabletSiteNavMenu = function() {
        //On physical Ipad, these events are not needed, hence check for IOS mobile
        if(MobileChecker.isPhoneOrTablet() && !MobileChecker.isIOSMobileDevice()){
          var activeCategory = '';
          var isDropdownActive = false;
  
          $('.mz-sitenav-link').click(function(e){
                if(activeCategory === e.target.text && isDropdownActive) {
                return;
                } else {
                    //Prevent link redirect
                    e.preventDefault();
                    activeCategory = e.target.text;
                    isDropdownActive = true;
                }
          });
  
          $(document).on("click", function(e){
            if($(e.target).closest('.mz-sitenav-link').length === 0) isDropdownActive = false;
          });
         
        } 
    };

    return {
        openParentCategory: openParentCategory,
        closeParentCategory: closeParentCategory,
        openThirdLevelCategory: openThirdLevelCategory,
        hideThirdLevelCategory: hideThirdLevelCategory,
        closeMenuInOpenCategory: closeMenuInOpenCategory,
        disableMobileScrolling: disableMobileScrolling,
        displayHideHamhurgMenu: displayHideHamhurgMenu,
        handleTabletSiteNavMenu: handleTabletSiteNavMenu
    };
});