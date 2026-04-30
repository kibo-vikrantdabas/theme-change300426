define([
    "modules/jquery-mozu",
    "underscore",
    "hyprlive",
    "modules/backbone-mozu"
], function($, _, Hypr, Backbone) {

    var ReturnOrderListingView = Backbone.MozuView.extend({
        templateName: "modules/my-account/order-history-listing-return",
        getRenderContext: function () {
          var context = Backbone.MozuView.prototype.getRenderContext.apply(
            this,
            arguments
          );
          var order = this.model;
          if (order) {
            this.order = order;
            context.order = order.toJSON();
          }
          return context;
        },
        render: function () {
          var self = this;
          var returnItemViews = [];
    
          self.model.fetchReturnableItems().then(function (data) {
            var returnableItems = self.model.returnableItems(data.items);
            if (self.model.getReturnableItems().length < 1) {
              self.trigger("renderMessage", {
                messageType: "noReturnableItems",
              });
              return false;
            }
            Backbone.MozuView.prototype.render.apply(self, arguments);
    
            $.each(
              self.$el.find("[data-mz-order-history-listing-return-item]"),
              function (index, val) {
                var packageItem = returnableItems.find(function (model) {
                  if ($(val).data("mzOrderLineId") == model.get("orderLineId")) {
                    if ($(val).data("mzOptionAttributeFqn")) {
                      return (
                        model.get("orderItemOptionAttributeFQN") ==
                          $(val).data("mzOptionAttributeFqn") &&
                        model.uniqueProductCode() == $(val).data("mzProductCode")
                      );
                    }
                    return (
                      model.uniqueProductCode() == $(val).data("mzProductCode")
                    );
                  }
                  return false;
                });
    
                returnItemViews.push(
                  new ReturnOrderItemView({
                    el: this,
                    model: packageItem,
                  })
                );
              }
            );
    
            _.invoke(returnItemViews, "render");
          });
        },
        clearOrderReturn: function () {
          this.$el.find('[data-mz-value="isSelectedForReturn"]:checked').click();
        },
        cancelOrderReturn: function () {
          this.clearOrderReturn();
          this.trigger("returnCancel");
        },
        finishOrderReturn: function () {
          var self = this,
            op = this.model.finishReturn();
          if (op) {
            return op.then(
              function (data) {
                self.model.isLoading(false);
                self.clearOrderReturn();
                self.trigger("returnSuccess");
              },
              function () {
                self.model.isLoading(false);
                self.clearOrderReturn();
                this.trigger("returnFailure");
              }
            );
          }
        },
      });

      var ReturnOrderItemView = Backbone.MozuView.extend({
        templateName: "modules/my-account/order-history-listing-return-item",
        autoUpdate: [
          "isSelectedForReturn",
          "rmaReturnType",
          "rmaReason",
          "rmaQuantity",
          "rmaComments",
        ],
        dataTypes: {
          isSelectedForReturn: Backbone.MozuModel.DataTypes.Boolean,
        },
        startReturnItem: function (e) {
          var $target = $(e.currentTarget);
    
          if (this.model.uniqueProductCode()) {
            if (!e.currentTarget.checked) {
              this.model.set("isSelectedForReturn", false);
              this.model.cancelReturn();
              this.render();
    
              return;
            }
    
            this.model.set("isSelectedForReturn", true);
            this.model.startReturn();
            this.render();
          }
        },
        render: function () {
          Backbone.MozuView.prototype.render.apply(this, arguments);
        },
    });

    return ReturnOrderListingView;
    
});