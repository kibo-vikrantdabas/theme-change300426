define([
    "modules/jquery-mozu",
    "underscore",
    "hyprlive",
    "modules/backbone-mozu"
], function($, _, Hypr, Backbone) {
   
    var StoreCreditView = Backbone.MozuView.extend({
        templateName: "modules/my-account/my-account-storecredit",
        addStoreCredit: function (e) {
          var self = this;
          var id = this.$("[data-mz-entering-credit]").val();
          if (id)
            return this.model.addStoreCredit(id).then(function () {
              return self.model.getStoreCredits();
            });
        },
    });

    return StoreCreditView;
    
});