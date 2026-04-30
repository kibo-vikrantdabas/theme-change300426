define([
    'modules/jquery-mozu',
    'underscore',
    'modules/checkout/payment/BluePrepaidCardAction',
    'modules/checkout/payment/BlueWalletAction'
], function ($, _,  BluePrepaidCardAction, BlueWalletAction) {

    var pageContext = require.mozuData('pagecontext');

    var BluePayAction = {

        setInitialBluePaymentState: function (isDisplayModal, isDisplayBluePaymentMethods) {

            //General
            this.model.set('displayBluePaymentModal', isDisplayModal ? true : false);
            this.model.set('displayBluePaymentMethods', isDisplayBluePaymentMethods ? true : false);
            this.model.set('displayLoader', false);
            this.model.set('isAllowLoading', false);

            if(this.model.get('isCheckPayment')) this.model.unset('isCheckPayment');

            //For Blue Prepaid Card 
            BluePrepaidCardAction.setInitialBluePrepaidCardPaymentState.call(this, false, isDisplayBluePaymentMethods);

            //For Blue Wallet 
            BlueWalletAction.setInitialBlueWalletPaymentState.call(this, false, false, isDisplayBluePaymentMethods);


            this.model.set('denyAmountCapture', true);

        },
        listenBluePaymentStateChange: function () {

            //General 
            this.listenTo(this.model, 'change:displayBluePaymentModal', this.render);
            this.listenTo(this.model, 'change:displayBluePaymentMethods', this.render);
            this.listenTo(this.model, 'change:displayLoader', this.render);
            this.listenTo(this.model, 'change:isAllowLoading', this.render);

            //For Bluw Prepaid Card
            BluePrepaidCardAction.listenBluePrepaidStateChange.call(this);

            //For Blue Wallet
            BlueWalletAction.listenBlueWalletStateChange.call(this);

            this.listenTo(this.model, 'change:denyAmountCapture', this.render);

        },
        displayBlueModal: function () {
            BluePayAction.setInitialBluePaymentState.call(this, true, true);

            setTimeout(function () {

                window.scrollTo({ top: (window.innerHeight) / 2, behavior: 'smooth' });

                //code for backdrop on checkout page
                if (window.matchMedia('(max-width: 710px)').matches) {
                    $("header").hide();
                    $("footer").hide();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }

                $(".mz-backdrop").attr("style", "top:0% !important; height:" + $(document).height() + "px !important;");
                $('.mz-backdrop').addClass('active').removeClass('deactive');
            }, 200);
        },
        closeModal: function () {

            BluePayAction.setInitialBluePaymentState.call(this, false, false);


            $(".mz-blue-popup").css("height", "361px");
            $('.mz-backdrop').addClass('deactive').removeClass('active');
            $("header").show();
            $("footer").show();

            BluePrepaidCardAction.cardNumberOrPinError.call(this, false);
            BluePrepaidCardAction.manageCardError.call(this, false);

            BlueWalletAction.stopOTPTimer();

        },
        backToBluePaymentMethods: function () {

            BluePayAction.setInitialBluePaymentState.call(this, true, true);

            BluePrepaidCardAction.cardNumberOrPinError.call(this, false);
            BluePrepaidCardAction.manageCardError.call(this, false);

            BlueWalletAction.stopOTPTimer();

            if (window.matchMedia('(min-width: 712px)').matches && window.matchMedia('(max-width:765px)').matches) {
                $(".mz-blue-popup").css("height", "550px");

            }

            else if (window.matchMedia('(min-width: 768px)').matches && window.matchMedia('(max-width:1138px)').matches) {
                $(".mz-blue-popup").css("height", "450px");


            }
            else if (window.matchMedia('(min-width: 1137px)').matches && window.matchMedia('(max-width:1139px)').matches) {
                $(".mz-blue-popup").css("height", "450px");
            }

        },
        getDeductAmount: function (balance) {
            return window.order.get('total') <= balance ? window.order.get('total') : balance;
        },
        customerValue: function (event) {

            var inputvalue = event.target.value,
                self = this;

            if (event.ctrlKey) event.target.value = BluePayAction.roundOffBluePayment(inputvalue);

            BluePayAction.getPaymentFlagAndRemaningAmount.call(this, event);

        },
        roundOffBluePayment: function(amount) {
            var finalAmount = Number(amount);
            var amountInput = finalAmount.toString().split('.');
            if(amountInput.length > 1) {
                var decimalValue = amountInput[1];
                if(amountInput[1].length >= pageContext.currencyInfo.precision) {
                    decimalValue = amountInput[1].slice(0, pageContext.currencyInfo.precision);
                }
                else {
                    var remainingDigitCount = pageContext.currencyInfo.precision - amountInput[1].length;
                    decimalValue = amountInput[1]*Math.pow(10,remainingDigitCount);
                }
                finalAmount = Number(amountInput[0]+"."+decimalValue).toFixed(pageContext.currencyInfo.precision);
            }
            else {
                finalAmount = finalAmount.toFixed(pageContext.currencyInfo.precision);
            }
            return finalAmount;
        },
        getPaymentFlagAndRemaningAmount : function(event) {
            var self = this,
                isPaymentAllow = false,
                remainingAmount,
                walletBalance = self.model.get('blueWalletBalance'),
                prepaidCardBalance = self.model.get('bluePrepaidCardBalance'),
                paidByBlueWallet = self.model.get('blueWalletDeductAmount'),
                paidByBluePrepaidCard = self.model.get('bluePrepaidCardDeductAmount'),
                orderTotal = self.model.parent.get('total');

                         // When User initiates first Blue Payment  
                if(_.isUndefined(paidByBlueWallet) && _.isUndefined(paidByBluePrepaidCard)) {
                    
                    if(window.order.get('isWalletDeducation')) remainingAmount = BluePayAction.getRemainingAmount.call(this, walletBalance, event); 
                    
                    if(window.order.get('isPrepaidDeducation')) remainingAmount = BluePayAction.getRemainingAmount.call(this, prepaidCardBalance, event);
                }
                
                // MultiPayment - When a payment has already done with blue wallet  and users tries with blueprepaid card
                if(!_.isUndefined(paidByBlueWallet) && window.order.get('isPrepaidDeducation')) {

                    this.model.set('isPartialPaidByWallet',true);

                    remainingAmount = ( orderTotal - paidByBlueWallet ) <= prepaidCardBalance ? ( orderTotal - paidByBlueWallet ) : prepaidCardBalance;
                    
                    if(event) if( event.target.value > remainingAmount || event.target.value < remainingAmount ) event.target.value = BluePayAction.roundOffBluePayment(remainingAmount);

                    if(event) if(event.target.value.length >= 0 ) BluePayAction.setAmountPayFlag.call(this, event.target.value, remainingAmount);
                    
                }
                    
                // MultiPayment -  When a payment has already done with  blue prepaid card and users tries with bluewallet 
                if(!_.isUndefined(paidByBluePrepaidCard) && window.order.get('isWalletDeducation')) {

                    this.model.set('isPartialPaidByPrepaidCard',true);

                    remainingAmount =  ( orderTotal - paidByBluePrepaidCard ) <= walletBalance ? ( orderTotal - paidByBluePrepaidCard ): prepaidCardBalance ;
                    

                    if(event) if( event.target.value > remainingAmount || event.target.value < remainingAmount ) event.target.value = BluePayAction.roundOffBluePayment(remainingAmount);

                    if(event) if( event.target.value.length >= 0 ) BluePayAction.setAmountPayFlag.call(this, event.target.value, remainingAmount);
               
                }

                if(!this.model.get('isPartialPaidByWallet')) {

                    if(!_.isUndefined(paidByBluePrepaidCard) && window.order.get('isPrepaidDeducation')) 
                        remainingAmount = BluePayAction.getRemainingAmount.call(this, prepaidCardBalance, event);
                }
                
                if(!this.model.get('isPartialPaidByPrepaidCard')) {
                    if(!_.isUndefined(paidByBlueWallet) && window.order.get('isWalletDeducation')) 
                        remainingAmount = BluePayAction.getRemainingAmount.call(this, walletBalance, event); 
                }
                  

                return { isPaymentAllow : isPaymentAllow , remainingAmount : remainingAmount };
        },
        displayDeductBalance: function () {

            this.model.set('displayBluePaymentMethods', true);

            this.model.set('amountToPaid', BluePayAction.roundOffBluePayment(Number(BluePayAction.getPaymentFlagAndRemaningAmount.call(this, undefined).remainingAmount)));

            if (window.order.get('isPrepaidDeducation')) BluePrepaidCardAction.setStateBluePrepaidPayment.call(this, BluePayAction.getPaymentFlagAndRemaningAmount.call(this, undefined).remainingAmount);

            if (window.order.get('isWalletDeducation')) BlueWalletAction.setStateBlueWalletPayment.call(this, BluePayAction.getPaymentFlagAndRemaningAmount.call(this, undefined).remainingAmount);


            if (window.matchMedia('(min-width: 712px)').matches && window.matchMedia('(max-width:765px)').matches) {
                $(".mz-blue-popup").css("height", "550px");

            }

            else if (window.matchMedia('(min-width: 768px)').matches && window.matchMedia('(max-width:1138px)').matches) {
                $(".mz-blue-popup").css("height", "545px");

            }
        },
        getRemainingAmount: function (balance, event) {

            var remainingAmount;

            if (!_.isUndefined(balance)) remainingAmount = BluePayAction.getDeductAmount(balance);

            BluePayAction.setRemainingAmount(remainingAmount, event);

            return remainingAmount;

        },
        setRemainingAmount: function (remainingAmount, event) {

            if (event) if (Number(event.target.value) > Number(remainingAmount)) event.target.value = remainingAmount;

            if (event) if (event.target.value.length >= 0) BluePayAction.setAmountPayFlag(event.target.value, remainingAmount);
        },
        setAmountPayFlag: function (inputvalue, remainingAmount) {
            setTimeout(function () {
                document.getElementById('bluePaymentAmountToPaid').disabled = !((1 <= Number(inputvalue)) && (Number(inputvalue) <= Number(remainingAmount)) && (Number(remainingAmount) >= 1));
            }, 200);
        },
        checkFreezCustomAmount: function (event) {
            var amount = event.target.value,
                decimalIndex;
            if (amount.includes(".")) {
                decimalIndex = amount.indexOf(".");
                if (decimalIndex === 0) event.target.value = amount;
                event.target.value = amount.substr(0, decimalIndex).concat(amount.substr(decimalIndex, pageContext.currencyInfo.precision + 1));

            }

        },
        preventArrowKeyInput: function (event) {
            if (event.keyCode === 38 || event.keyCode === 40) this.model.set('isArrowKeyInput', true);
        },
        handleArrowKeyInput: function(key, event) {
            if(this.model.get('isArrowKeyInput')) {
                event.target.value = this.model.get(key);
                this.model.set('isArrowKeyInput', false);
            }
            else {
                this.model.set(key, event.target.value);
            }
        },
        setCaptureAmountByBluePay: function() {

            var amountToPaid = this.model.get('amountToPaid');

            if (window.order.get('isWalletDeducation')) {
                this.model.set("blueWalletDeductAmount", amountToPaid);
                window.order.set('WalletDeducation', Number(amountToPaid));
            }

            if (window.order.get('isPrepaidDeducation')) {
                this.model.set("bluePrepaidCardDeductAmount", amountToPaid);
                window.order.set('prepaidDeducation', Number(amountToPaid));
            }
            if(this.model.get("billingContact").get("phoneNumbers")) {
                this.model.get("billingContact").get("phoneNumbers").set("home", this.model.get("customerBlueMobileNumber"));
            }
            this.model.set('hasPaymentDone', true);
            this.model.set('displayBluePaymentModal', false);
            this.model.set('displayBluePaymentMethods', false);

            if (this.model.get('displayBlueWalletAmountCapture')) this.model.set('displayBlueWalletAmountCapture', false);
            if (this.model.get('displayBluePrepaidAmountCapture')) this.model.set('displayBluePrepaidAmountCapture', false);
            
            $('.mz-backdrop').addClass("deactive").removeClass("active");

        }
    };


    return BluePayAction;

});