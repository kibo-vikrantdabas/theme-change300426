define([
    'modules/jquery-mozu', 
    'underscore'
], function($, _) {
    var Hanlder = {
        handleDefaultStatus : function(user) {
            if(user.isAnonymous) {
                Hanlder.handleDeliveryPaymentGuest.call(this);
            }
            else {
                this.$el.removeClass('is-new is-incomplete is-complete is-invalid').addClass('is-' + this.model.stepStatus());
                if($("#step-shipping-address").hasClass("is-complete")) {
                    if(_.isEqual(this.$el.attr('id'), "step-payment-info")) {
                        if(_.isEqual(this.model.stepStatus(), "complete")) {
                            var el = this.$el;
                            setTimeout(function(){el.removeClass('is-new is-incomplete is-invalid').addClass("is-complete");},200);
                        }
                        else {
                            $("#step-payment-info").removeClass('is-new is-incomplete is-complete is-invalid').addClass("is-incomplete");
                        }
                    }                    
                }
            }
        },
        handleDeliveryPaymentGuest : function() {
            /**
             * @des - his Code will display Delivery Option And Payment Option To Guest User Once Shipping Adress Captured
             */
            if($("#step-shipping-address").hasClass("is-complete")) {
                $("#step-shipping-method").removeClass('is-new is-incomplete is-complete is-invalid').addClass("is-complete");
                if(_.isEqual(this.$el.attr('id'), "step-payment-info")) {
                    if(_.isEqual(this.model.stepStatus(), "complete")) {
                        var el = this.$el;
                        setTimeout(function(){el.removeClass('is-new is-incomplete is-invalid').addClass("is-complete");},200);
                    }
                    else {
                        $("#step-payment-info").removeClass('is-new is-incomplete is-complete is-invalid').addClass("is-incomplete");
                    }
                }
                $("#step-payment-info").removeClass('is-new is-incomplete is-complete is-invalid').addClass("is-incomplete");
            }
            else {
                this.$el.removeClass('is-new is-incomplete is-complete is-invalid').addClass('is-' + this.model.stepStatus());
            }
        }
    };

    return Hanlder;
    
});