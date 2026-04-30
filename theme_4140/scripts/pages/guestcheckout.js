define(['modules/backbone-mozu',
    'modules/jquery-mozu',
    'hyprlive',
    'modules/editable-view',
    'modules/api',
    'hyprlivecontext','underscore','modules/analytics/checkout-gtm'],


    function (Backbone, $, Hypr, EditableView, api, HyprLiveContext,_,CheckoutGTM) {
    	var forgotpasswordView = EditableView.extend({
			templateName: 'modules/checkout/guest-checkout',
			autoUpdate: [
			  'reset-password'
			],
            additionalEvents:{
                "click [data-mz-action='checkout-submit']":"guestCheckoutuser",
                "keyup [data-mz-checkout-email]":"checkEmail"
            },
            checkEmail:function(event){
                var $el = $(event.currentTarget);
                var email = $el.val().trim();
            if (email === '') {
                this.$el.find('[data-mz-checkout-email]').addClass("is-invalid");
                this.$el.find('[data-mz-checkout-email]').removeClass(" is-valid");
                this.$el.find('[data-mz-checkout-email]').attr("placeholder",Hypr.getLabel('signupemailValidationMessage'));
            
                }else if(!this.isEmail(email)) {
                $('.mz-login-email-valid-div').removeClass('hidden');
                this.$el.find('[data-mz-checkout-email]').addClass("is-invalid");
                this.$el.find('[data-mz-checkout-email]').removeClass(" is-valid");
                $('.mz-login-email-valid-div').html(Hypr.getLabel('emailMissing'));
                }
                else {
                    this.$el.find('[data-mz-checkout-email]').removeClass("is-invalid"); 
                    this.$el.find('[data-mz-checkout-email]').addClass(" is-valid");
                    $('.mz-login-email-valid-div').html('');
                    $('.mz-login-email-valid-div').addClass('hidden');
                }
            },
            isEmail:function(email){
                var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
                return regex.test(email);
            },
            guestCheckoutuser:function(e){
                e.preventDefault();
                var guestUserEmail =this.$el.find('[data-mz-checkout-email]').val();
                if(!this.isEmail(guestUserEmail)) {
                    this.$el.find('[data-mz-checkout-email]').addClass("is-invalid");
                    $('.mz-login-email-valid-div').removeClass('hidden');
                    $('.mz-login-email-valid-div').text(Hypr.getLabel('emailMissing'));
                   }else{
                var $form = $('#checkoutform');
                var isAuthenticatedUser = require.mozuData('user').isAuthenticated;
                var User = require.mozuData('user');
                User.email = guestUserEmail;
                if(!isAuthenticatedUser) {
                  $.cookie('guestUserEmail', guestUserEmail, { path: '/' });
                  $form.attr('action', (HyprLiveContext.locals.siteContext.siteSubdirectory || '') +  "/cart/checkout");
                  $form.submit();
                } else {
                   this.model.trigger('error', {
                      message: Hypr.getLabel('guestCheckoutError')
                  });
                }
             }
            },
            checkInventory:function(vpc,locationCode,index,itemsLength,$form){
            
                api
                .request(
                  "POST",
                  "/api/commerce/inventory/v5/inventory/",
                  this.getInventoryPayload(vpc,locationCode)
                )
                .then(function (res) { 
                      var outofStock = false;
                      if(_.isEmpty(res)){
                        window.location.href=(HyprLiveContext.locals.siteContext.siteSubdirectory||'')+'/cart';
                      } 
                      if(res[0].upc == vpc && res[0].available<=0 ){
                        outofStock=true;
                        window.location.href=(HyprLiveContext.locals.siteContext.siteSubdirectory||'')+'/cart';
                      }
                      if(index == (itemsLength-1) &&  !outofStock){
                        $form.attr('action', (HyprLiveContext.locals.siteContext.siteSubdirectory || '') +  "/cart/checkout");
                        $form.submit();
                      }
                });
              },
              getInventoryPayload:function(variationProductCode,locationCode){
                return {
                  requestLocation: {
                    locationCode: locationCode,
                  },
                  type: "ALL",
                  items: [
                    {
                      "upc":variationProductCode,
                      "quantity": 1
                    }
                  ],
                  includeNegativeInventory: true,
                };
              },
            initialize:function(){
            },
			render: function() {
				Backbone.MozuView.prototype.render.apply(this); 
			}
		});

		var Model = Backbone.MozuModel.extend({
            validation: {
                  'reset-password': {
                    pattern: 'email',
                    msg: Hypr.getLabel('emailMissing')
                  }
		    }
        });
        
		var loginModel = new Model();
		var $efp = $('#guest-checkout');
		var forgotPasswordFormView = new forgotpasswordView({
		    el: $efp,
		    model: loginModel
		});
		forgotPasswordFormView.render();
		$(document).ready(function(){
		});
    });