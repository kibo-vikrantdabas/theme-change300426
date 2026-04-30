define([
    "modules/jquery-mozu", 
    "modules/api",
    "underscore"
], function($, api, _) {
    function wishlistCountHandler() {
        if(require.mozuData("user").isAuthenticated){
            api.request("GET", "/api/commerce/wishlists")
            .then(function(wishlistsData) {
              if(wishlistsData.items.length > 0) {
                api.request("GET", "/api/commerce/wishlists/customers/"+ require.mozuData("user").accountId +"/my_wishlist")
                .then(function(wishlistData) {
                  var wishlistItemModel = wishlistData.items;
                  if (wishlistItemModel.length > 0) {
                    $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').html('<span class="wishlist-count">'+ wishlistItemModel.length + '</span>');
                    $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon').hide();
                    $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon-green').show();
                  }
                });
              }
            });
          } else {
            var wishlistItemObject = JSON.parse(($.cookie("guestWishlistN"))? ($.cookie("guestWishlistN")): false);
            if(wishlistItemObject.length > 0){
              $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').html('<span class="wishlist-count">'+ wishlistItemObject.length + '</span>');
              $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon').hide();
              $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon-green').show();
            }
          }
    }

    return {
        wishlistCountHandler: wishlistCountHandler
    };
});