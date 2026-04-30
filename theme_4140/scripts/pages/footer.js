require([
   "modules/jquery-mozu", 
   "modules/flyout",
   "modules/analytics/footerGA",
   "modules/analytics/checkout-process-gtm"
  ], 
   function ($, Flyout, FooterGAHandler, CheckoutProcessEvent) {
  
      function handleDeliveryTerms() {
        $('.mz-terms-conditions').on('click', function() { 
          sessionStorage.setItem('isFromPDP', true); 
        });
      }


      function gtmForShopByBrand(eventAction, brandName) {
        var shopByBrandData = {
          eventCategory: "modules",
          eventAction: eventAction.toLowerCase() + " : " + brandName.toLowerCase(),
          eventLabel: 'banner click',
        };
        if (window.globalEventBus) window.globalEventBus.emit("dataLayerEvent", shopByBrandData);
      }

      $(document).ready(function() {
        //footer accordion 
      $(".accordion-header").on("click", function(e) {
        e.preventDefault();	
              if ($(this).hasClass("active")) {
              $(this).removeClass("active");
              $(this)
                  .siblings(".accordian")
                  .slideUp(200);
                
              } else {
              $(".accordion-header").removeClass("active");
              $(this).addClass("active");
              $(".accordian").slideUp(200);
              $(this)
                  .siblings(".accordian")
                  .slideDown(200);
              }
        });


          
          FooterGAHandler.footerLinksGTM();
          Flyout.desktopFlyout();
          handleDeliveryTerms();

          $(".slick-active img").click(function () {
            var eventAction = $(".slick-active")
              .parents(".mz-content-widget-inner-wrap")
              .find("h2")
              .text();
            var brandName = $(this).attr("alt");
            gtmForShopByBrand(eventAction, brandName);
          });

      });
});
