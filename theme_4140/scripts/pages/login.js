define(['modules/jquery-mozu', 'modules/api', 'hyprlive', 'underscore', 'modules/backbone-mozu', 'hyprlivecontext', 'vendor/jquery-placeholder/jquery.placeholder','modules/analytics/checkout-gtm', 'modules/analytics/login-event'],
function ($, api, Hypr, _, Backbone, HyprLiveContext, Placeholder,CheckoutGTM, loginEvent) {
    var UserViews = Backbone.MozuView.extend({
        templateName: 'modules/login/login',
        additionalEvents:{
            "click [data-mz-action='loginpage-submit']": "login",
            "click #eye-password-register": "showPassword",
            "keyup [data-mz-login-email]": "checkSignInEmail",
            "keyup [data-mz-login-password]": "checkSignInPassword"
        },
        checkSignInEmail: function(event){
            var $el = $(event.currentTarget);
            var email = $el.val();
           if (email === '') {
             this.$el.find('[data-mz-login-email]').addClass("is-invalid");
             this.$el.find('[data-mz-login-email]').attr("placeholder",Hypr.getLabel('signupemailValidationMessage'));
             $('.mz-login-email-valid-div').addClass('hidden');
             $('.mz-login-email-valid-div').text('');
            }else if(!this.isEmail(email)) {
              this.$el.find('[data-mz-login-email]').addClass("is-invalid");
              $('.mz-login-email-valid-div').removeClass('hidden');
              $('.mz-login-email-valid-div').text(Hypr.getLabel('emailMissing'));
            }
            else {
              this.$el.find('[data-mz-login-email]').removeClass("is-invalid");
              this.$el.find('[data-mz-login-email]').addClass("is-valid");
              $('.mz-login-email-valid-div').addClass('hidden');
              $('.mz-login-email-valid-div').text('');
            }
          },
        checkSignInPassword: function(event) {
            var $el = $(event.currentTarget);
            var password = $el.val();
           if (password === '') {
             this.$el.find('[data-mz-login-password]').removeClass("is-valid");
             this.$el.find('[data-mz-login-password]').addClass("is-invalid");
             this.$el.find('[data-mz-login-password]').attr("placeholder",Hypr.getLabel('signuppasswordValidationMessage'));
            }
            else {
              this.$el.find('[data-mz-login-password]').removeClass("is-invalid");
              this.$el.find('[data-mz-login-password]').addClass("is-valid");
            }
          },
        showPassword: function() {
            var passwordField = $('[data-mz-login-password]');
            if(passwordField && passwordField.attr('type')=='password') {
              passwordField.attr('type','text');
              $('.eye-open').addClass('hidden');
              $('.eye-close').removeClass('hidden');
              $('.eye-close').addClass('visible');
            }
            else {
              passwordField.attr('type','password');
              $('.eye-open').removeClass('hidden');
              $('.eye-close').removeClass('visible');
              $('.eye-close').addClass('hidden');
            }
          },
          hashEmail:function(email){
            var hashSalt = 'make_this_unique';
            var hashed_email='';
            var self = this;
            window.crypto.subtle.digest(
              'SHA-256',
              new TextEncoder().encode(email.toLowerCase() + hashSalt)
          ).then(function(hashed) {
              // The digest is returned in a wonky format so we need to convert it to a hex string
              var encryptedEmail = [].map.call(
                  new Uint8Array(hashed),
                  function(b) {
                      return ('00' + b.toString(16)).slice(-2);
                  }
              ).join('');
              // Done!
              hashed_email = encryptedEmail;
              self.model.set('hashed_email', encryptedEmail);
          });
             
        },
          login: function(event){
            event.preventDefault();
            var email = this.$el.find('[data-mz-login-email]').val(),
              password = this.$el.find('[data-mz-login-password]').val(),
              returnUrl = this.$el.find('[data-mz-returnUrl]').val();
              this.hashEmail(email);
              if (email === '') {
                this.$el.find('[data-mz-login-email]').addClass("is-invalid");
                this.$el.find('[data-mz-login-email]').attr("placeholder",Hypr.getLabel('signupemailValidationMessage'));
                $('.mz-login-email-valid-div').addClass('hidden');
                $('.mz-login-email-valid-div').text(''); 
              }
               else if(!this.isEmail(email)) {
                this.$el.find('[data-mz-login-email]').addClass("is-invalid");
                $('.mz-login-email-valid-div').removeClass('hidden');
                $('.mz-login-email-valid-div').text(Hypr.getLabel('emailMissing'));
               }
               else if (password === '') {
                 this.$el.find('[data-mz-login-email]').removeClass("is-invalid");
                 $('.mz-login-email-valid-div').addClass('hidden');
                 $('.mz-login-email-valid-div').text('');
                 this.$el.find('[data-mz-login-password]').addClass("is-invalid");
                 this.$el.find('[data-mz-login-password]').attr("placeholder",Hypr.getLabel('signuppasswordValidationMessage'));
               } 
               else {
                 var self=this;
                 var eventData = {
                  custom_event: 'account',
                  event_params:{
                    event_act: 'sign in'
                    }
                  };
                    api.action('customer', 'loginStorefront', {
                      email: email,
                      password: password
                    }).then(function (res) {
                      
                        $.cookie("loggedIn", true, {path: "/"});

                        var currentTimestamp = Date.now();

                        $.cookie("afg-login-at", currentTimestamp, {path: "/;SameSite=Lax", secure: true, expires: 10800});
                       
                       
                        var cartItemsModule = window.CartPopoutInstance.model;
                        
                        if(returnUrl === "guest-checkout-signin"){
                          // var redirectCart=false;
                          // var CartItems = window.CartPopoutInstance.model;

                          
                          // CartItems.get('items').each(function(item, index){
                          //   var vpc =item.get('product').get('variationProductCode');
                          //   var locationCode = item.get('fulfillmentLocationCode');
                          //   var ItemLength =CartItems.get('items').length;
                          //   self.checkInventory(vpc,locationCode,index,ItemLength);
                          // });
                          if(window.globalEventBus){
                            eventData.event_lbl = 'successful:email';
                            eventData.email_hashed = self.model.get('hashed_email');

                            window.globalEventBus.emit('dataLayerEvent', eventData);
                          }
                          window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory||'')+'/cart/checkout';
                        }else{
                          loginEvent.userLogin();
                          if(window.globalEventBus){
                            eventData.event_lbl = 'successful:email';
                            eventData.email_hashed = self.model.get('hashed_email');
                            window.globalEventBus.emit('dataLayerEvent', eventData);
                          }
                          window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory||'')+'/myaccount';
                        }
                      }, function (err) {
                        if(window.globalEventBus){
                          eventData.event_lbl = 'fail:email';
                          eventData.email_hashed = self.model.get('hashed_email');
                          window.globalEventBus.emit('dataLayerEvent', eventData);
                        }
                        $('.login-validation-error-msg').html('<span class="login-validation-msg"  tabindex="0" >' + Hypr.getLabel('signInValidationMessage') + '</span>');
                        $('html,body').animate({
                          scrollTop: $(".mz-loginpage .mz-l-pagecontent").offset().top},
                        'slow');
                      });
              }
          },
          checkInventory:function(vpc,locationCode,index,itemsLength){
            
            api
            .request(
              "POST",
              "/api/commerce/inventory/v5/inventory/",
              this.getInventoryPayload(vpc,locationCode)
            )
            .then(function (res) { 
                  var outofStock = false;
                  if(_.isEmpty(res)) window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory||'')+'/cart';
                  if(res[0].upc == vpc && res[0].available<=0 ){
                    outofStock=true;
                    window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory||'')+'/cart';
                  }
                  if(index == (itemsLength-1) &&  !outofStock){
                    window.location.href = (HyprLiveContext.locals.siteContext.siteSubdirectory||'')+'/cart/checkout';
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
          render:function(){
            var me = this;
            Backbone.MozuView.prototype.render.apply(this);
          },
          initialize: function () {
            var me = this;
            var user = require.mozuData('user');
            if(user.isAuthenticated){
              if(window.location.href.indexOf('/login') > -1) {
                window.location.href = location.origin.concat((HyprLiveContext.locals.siteContext.siteSubdirectory||'')+"/myaccount");
              }
            }
          },
          isEmail: function (email) {
            var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            return regex.test(email);
        }
    });
    $(document).ready(function() {
      
        var Model = Backbone.MozuModel.extend({

          validation: {
            'email': [{
              required: true
            },{
              pattern: 'email'
            }],
            'password': [{
              required: true  
            }]
          }
        });
        var loginModel = new Model();
        var loginEl = $('#loginContainer');
        var userViews = window.userView = new UserViews({
            model: loginModel,
            el:loginEl
        });

        userViews.render();
    });
});