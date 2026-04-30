define([
    "modules/jquery-mozu",
    "underscore",
    "hyprlive",
    "modules/editable-view"
], function($, _, Hypr, EditableView) {

    /** 
     * I have just Modularized The Code Which was written in myaccount.js file. 
     * I did not change any logic. 
     */

    var WishListView = EditableView.extend({
        templateName: "modules/my-account/my-account-wishlist",
        addItemToCart: function (e) {
          var self = this,
            $target = $(e.currentTarget),
            id = $target.data("mzItemId");
          if (id) {
            this.editing.added = id;
            return this.doModelAction("addItemToCart", id);
          }
        },
        doNotRemove: function () {
          this.editing.added = false;
          this.editing.remove = false;
          this.render();
        },
        beginRemoveItem: function (e) {
          var self = this;
          var id = $(e.currentTarget).data("mzItemId");
          if (id) {
            this.editing.remove = id;
            this.render();
          }
        },
        finishRemoveItem: function (e) {
          var self = this;
          var id = $(e.currentTarget).data("mzItemId");
          if (id) {
            var removeWishId = id;
            return this.model.apiDeleteItem(id).then(function () {
              self.editing.remove = false;
              var itemToRemove = self.model.get("items").where({
                id: removeWishId,
              });
              if (itemToRemove) {
                self.model.get("items").remove(itemToRemove);
                self.render();
              }
            });
          }
        },
      });
    
    return WishListView;
});