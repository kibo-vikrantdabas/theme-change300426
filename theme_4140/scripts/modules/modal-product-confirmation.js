define(["modules/jquery-mozu", "modules/backbone-mozu", "modules/modal-dialog", "modules/models-product", "modules/cart-monitor", "hyprlive"], function($, Backbone, ModalDialog, ProductModels, CartMonitor, Hypr){
	

	var ProductConfirmationModal = Backbone.MozuView.extend({
		templateName: "modules/product/product-confirmation",
		show : function(e) {
			var self = this;
			this.modal = new ModalDialog.init({
				elementId : "confirmation-modal",
				width: 500,
				body: ""
			});
			// var productCode = e.currentTarget.dataset.productcode;
			// console.log(productCode);
			// this.getProduct(productCode).then(function(){
			// 	self.modal.show();
			// });
			self.modal.show();
		},
		getProduct : function(productCode){
			var self = this;
			var product = new ProductModels.Product({
				productCode: productCode
			});

			product.on('change', function(){
				if (self.model.get("properties")){
					self.render();
				}
			});

			
			product.on('addedtocart', function (cartitem, stopRedirect) {
				if (cartitem && cartitem.prop('id')) {
						// product.isLoading(true);
						CartMonitor.update();
						// window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory||'') + "/cart";
				} else {
						product.trigger("error", { message: Hypr.getLabel('unexpectedError') });
				}
			});

			return product.apiGet().then(function(){
				self.model = product;
				// self.model.set('fulfillmentMethod', 'Ship');
				self.trigger("fetch-product");
			})
			.catch(console.log);

		},
		render: function(){
			var self = this;
			Backbone.MozuView.prototype.render.apply(self);
		},
	});

	return {
		ProductConfirmationModal : ProductConfirmationModal
	};
});