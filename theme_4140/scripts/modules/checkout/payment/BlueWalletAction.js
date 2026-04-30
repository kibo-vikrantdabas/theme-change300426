define([
    'modules/jquery-mozu',
    'hyprlive',
    'modules/api',
    'hyprlivecontext',
    'underscore',
    'modules/mobile-number-length'
], function ($, Hypr, api, HyprLiveContext, _, MobileNumberChecker) {

    var counter = 59,
        timerIntervalId,
        customerMobileNumber,
        pageContext = require.mozuData('pagecontext'),
        BluePayAction = {},
        BluePrepaidCardAction = {};


    var BlueWalletAction = {

        setInitialBlueWalletPaymentState: function (isOTPFormDisplay, isMobileFormDisplay, isDisplayBluePaymentMethods) {
            this.model.set('displayOTPForm', isOTPFormDisplay ? true : false);
            this.model.set('isOTPInvalid', false);
            this.model.set('isOTPExpired', false);
            this.model.unset('dialingCode');
            this.model.unset('blueAccountMobileNumber');
            this.model.set('isAnotherBlueAccount', isMobileFormDisplay ? true : false);
            this.model.set('isMobileNumberInvalid', false);
            this.model.set('displayBlueWalletAmountCapture', false);
            this.model.set('displayBluePaymentMethods', isDisplayBluePaymentMethods ? true : false);
            window.order.unset('isWalletDeducation');

        },
        listenBlueWalletStateChange: function () {
            this.listenTo(this.model, 'change:displayOTPForm', this.render);
            this.listenTo(this.model, 'change:displayBlueWalletAmountCapture', this.render);
            this.listenTo(this.model, 'change:isOTPInvalid', this.render);
            this.listenTo(this.model, 'change:isOTPExpired', this.render);
            this.listenTo(this.model, 'change:isAnotherBlueAccount', this.render);
            this.listenTo(this.model, 'change:isMobileNumberInvalid', this.render);
            this.listenTo(this.model, 'change:dialingCode', this.render);
        },
        setStateBlueWalletPayment: function (deductAmount) {
            window.order.set('WalletDeducation', deductAmount);
            this.model.set('displayBlueWalletAmountCapture', true);
            this.model.set('displayOTPForm', false);
            this.model.set('displayBluePrepaidAmountCapture', false);
            this.model.set('isAnotherBlueAccount', false);
        },
        proceedToWallet: function (_BluePayAction, _BluePrepaidCardAction) {

            Object.assign(BluePayAction, _BluePayAction);
            Object.assign(BluePrepaidCardAction, _BluePrepaidCardAction);

            this.model.set('hasPrepaidSelected', false);
            this.model.set('displayLoader', true);

            BluePrepaidCardAction.setInitialBluePrepaidCardPaymentState.call(this, false, false);
            BlueWalletAction.setInitialBlueWalletPaymentState.call(this, false, false, false);

            customerMobileNumber = this.model.get('customerBlueNumber'); //Global Variable 
            
            countryDailingCode = Hypr.getThemeSetting('countrySpecificDialingCode');

                if (customerMobileNumber) {
                    customerDailingCode = customerMobileNumber.substr(0,4);
                    if(customerDailingCode == countryDailingCode){
                    BlueWalletAction.displayMobileNumber.call(this, customerMobileNumber);
                    customerMobileNumber = BlueWalletAction.formatMobileNumber.call(this, customerMobileNumber);
                    BlueWalletAction.sendOTP.call(this, customerMobileNumber);
                }else {
                    this.model.set('displayLoader', false);
                    BlueWalletAction.useAnotherBlueAccount.call(this);
                }

            }
            else {
                var userObject = require.mozuData('user');
                if (userObject.isAnonymous && !userObject.isAuthenticated && _.isEqual(userObject.email, "")) {
                    this.model.set('displayLoader', false);
                    BlueWalletAction.useAnotherBlueAccount.call(this);
                }
            }

        },
        useAnotherBlueAccount: function () {
            this.model.set('dialingCode', Hypr.getThemeSetting('countrySpecificDialingCode'));

            BlueWalletAction.setInitialBlueWalletPaymentState.call(this, false, true, false);

            document.getElementById("mz-submitMobileNumber").disabled = true;

            BlueWalletAction.stopOTPTimer();
        },
        submitMobileNumber: function () {
            var userCountryCode = this.model.get('dialingCode') ? this.model.get('dialingCode') : HyprLiveContext.locals.themeSettings.countrySpecificDialingCode,
                userMobileNumber = this.model.get('blueAccountMobileNumber'),
                self = this;

            self.model.set('isAllowLoading', true);

            if (userCountryCode && userMobileNumber && !_.isEqual(userCountryCode, '') && !_.isEqual(userMobileNumber, '')) {
                customerMobileNumber = userCountryCode.concat(" ", userMobileNumber);
                BlueWalletAction.displayMobileNumber.call(self, customerMobileNumber);
                customerMobileNumber = BlueWalletAction.formatMobileNumber.call(self, userCountryCode.concat(userMobileNumber));
            }

            if (customerMobileNumber) {
                api.request("POST", "/blue/checkCustomer?mobileNumber=" + customerMobileNumber)
                    .then(function (res) {
                        if (!_.isUndefined(res)) {
                            if (res.isBlueCustomer) {

                                BlueWalletAction.sendOTP.call(self, customerMobileNumber);
                                self.model.set('isMobileNumberInvalid', false);
                            }
                            else {
                                self.model.set('isMobileNumberInvalid', true);
                                self.model.set('isAllowLoading', false);
                            }
                        }
                    });
            }

        },
        sendOTP: function (customerMobileNumber) {
            var self = this;

            api.request("POST", "/blue/sendOTP?mobileNumber=" + customerMobileNumber)
                .then(function (res) {
                    if (_.isEqual(res.OtpResponseMessage.toLowerCase(), "otp generated successfully") && !self.model.get('hasPrepaidSelected') && !window.order.get('isWalletDeducation')) {

                        self.model.unset('blueAccountMobileNumber');
                        self.model.unset('dialingCode');
                        self.model.set('OTPNumber', '');
                        self.model.set('currentOTPNumber', '');
                        self.model.set('displayOTPForm', true);
                        self.model.set('isAnotherBlueAccount', false);
                        self.model.set('displayLoader', false);
                        self.model.set('isAllowLoading', false);
                        self.model.set('blueAccountMobileNumber', undefined);

                        document.getElementById("mz-submitOTPNumber").disabled = true;

                        timerIntervalId = setInterval(function () { BlueWalletAction.startTimer.call(self); }, 1000);
                    }
                    else {

                        if (!self.model.get('hasPrepaidSelected') && !window.order.get('isWalletDeducation')) {

                            self.model.set('displayLoader', false);
                            self.model.set('isAnotherBlueAccount', true);
                        }
                    }
                });
        },

        resendOTP: function () {
            this.model.set('isOTPInvalid', false);
            this.model.set('isOTPExpired', false);
            document.getElementById('mz-submitOTPNumber').disabled = true;
            BlueWalletAction.sendOTP.call(this, customerMobileNumber);
        },
        submitOTP: function () {

            var otpNUmber = this.model.get('OTPNumber'),
                self = this,
                validateOTPNumber;

            this.model.set('isAllowLoading', true);
            document.getElementById('mz-submitOTPNumber').disabled = true;

            if (!_.isUndefined(otpNUmber)) {
                validateOTPNumber = { "OTP": otpNUmber };

                api.request("POST", "/blue/validateOTP?mobileNumber=" + customerMobileNumber, validateOTPNumber)
                    .then(function (res) {
                        if (res.validateOTP) {

                            self.model.set('OTPNumber', undefined);
                            self.model.set('currentOTPNumber', undefined);

                            if( Hypr.getThemeSetting('disableSplitPayment')){  
                                if(res.walletBalance < window.order.get('total')){                           
                                   self.model.set('inSufficientBlueBalance',true);
                                   self.model.set('currentBlueBalanceAmount',res.walletBalance);
                                   BluePayAction.closeModal.call(self);
                               }
                               else{
                                       BlueWalletAction.stopOTPTimer();
                                       self.model.set('inSufficientBlueBalance',false);
                                           var deductAmount = BluePayAction.getDeductAmount(res.walletBalance);
                                           self.model.set('blueWalletBalance', BluePayAction.roundOffBluePayment(res.walletBalance));
                                       // self.model.set('blueWalletBalance', Number(res.walletBalance).toFixed(pageContext.currencyInfo.precision));
                                           self.model.set('tokenID', res.bluePaymentServiceTokenId);
       
                                           window.order.set('isWalletDeducation', true);
                                           window.order.unset('isPrepaidDeducation');
                                           window.order.set('WalletDeducation', deductAmount);
                                       
                                           BluePayAction.displayDeductBalance.call(self);
 
                               }
          
                           }else{

                               BlueWalletAction.stopOTPTimer();
                               self.model.set('inSufficientBlueBalance',false);
                                   var deductAmount = BluePayAction.getDeductAmount(res.walletBalance);
                                   self.model.set('blueWalletBalance', BluePayAction.roundOffBluePayment(res.walletBalance));
                               // self.model.set('blueWalletBalance', Number(res.walletBalance).toFixed(pageContext.currencyInfo.precision));
                                   self.model.set('tokenID', res.bluePaymentServiceTokenId);

                                   window.order.set('isWalletDeducation', true);
                                   window.order.unset('isPrepaidDeducation');
                                   window.order.set('WalletDeducation', deductAmount);
                               
                                   BluePayAction.displayDeductBalance.call(self);
                                }

                            self.model.set('isOTPInvalid', false);
                            self.model.set('isAllowLoading', false);
                        } else {

                            self.model.set('isAllowLoading', false);
                            self.model.set('isOTPInvalid', true);
                            document.getElementById('mz-submitOTPNumber').disabled = false;

                            //added code for mobile specific 
                            if (window.matchMedia('(min-width: 374px)').matches && window.matchMedia('(max-width:376px)').matches) {
                                $(".mz-otplables").css("margin-top", "-29px");
                            }
                            else if (window.matchMedia('(min-width: 410px)').matches && window.matchMedia('(max-width:413px)').matches) {
                                $(".mz-otplables").css("margin-top", "-7px");
                            }

                        }

                    });
            }
        },
        handleOTPNumber: function (event) {
            BluePayAction.handleArrowKeyInput.call(this, 'OTPNumber', event);
            document.getElementById('mz-submitOTPNumber').disabled = event.target.value.length === 0 ? true : false;
        },
        handleMobileNumber: function (event) {
            MobileNumberChecker.requriedMobileNumberLength(event);
            BluePayAction.handleArrowKeyInput.call(this, 'blueAccountMobileNumber', event);
            document.getElementById("mz-submitMobileNumber").disabled = event.target.value.length === 0 || event.target.value.length < 8 ? true : false;

        },
        displayMobileNumber: function (mobileNumber) {
            this.model.set('customerBlueMobileNumber', mobileNumber);
        },
        formatMobileNumber: function (mobileNumber) {
            var formatMobileNumber;
            if (mobileNumber.includes("+")) formatMobileNumber = mobileNumber.substr(1);
            formatMobileNumber = formatMobileNumber ? formatMobileNumber.split(" ") : mobileNumber.split(" ");
            return (formatMobileNumber && formatMobileNumber.length > 1) ? _.first(formatMobileNumber).concat(_.last(formatMobileNumber)) : _.first(formatMobileNumber);
        },
        startTimer: function () {
            var timerPrefix = "00:",
                timerSingleDigit = "00:0";

            switch (true) {
                case counter >= 10:
                    $(".mz-otptimer").text(timerPrefix.concat(counter));
                    counter--;
                    break;
                case counter >= 0 && counter < 10:
                    $(".mz-otptimer").text(timerSingleDigit.concat(counter));
                    counter--;
                    break;
                default:
                    this.model.set('isOTPInvalid', false);
                    this.model.set('isOTPExpired', true);
                    this.model.set('isAllowLoading', false);

                    //added code for mobile device
                    if (window.matchMedia('(min-width: 374px)').matches && window.matchMedia('(max-width:376px)').matches) {
                        $(".mz-otplables").css("margin-top", "6px");
                    }
                    else if (window.matchMedia('(min-width: 413px)').matches && window.matchMedia('(max-width:415px)').matches) {

                        $(".mz-otplables").css("margin-top", "6px");
                    }


                    BlueWalletAction.stopOTPTimer();

                    break;
            }
        },
        stopOTPTimer: function () {
            if (timerIntervalId) {
                clearInterval(timerIntervalId);
                counter = 59;
            }
        }
    };

    return BlueWalletAction;

});