define(
    ["modules/backbone-mozu", 'hyprlive', 'underscore', 'modules/country-data', 'hyprlivecontext'],
    function(Backbone, Hypr, _, GetCountryCities, HyprLiveContext) {

        var countriesRequiringStateAndZip = {
            US: true,
            CA: true,
            JP: true,
            TW: true
        },
        defaultStateProv = "n/a",
        defaultZipCode = "n/a",
        defaultCountryName = GetCountryCities().countryName,
        defaultCountryCode = GetCountryCities().countryCode,
        defaultCities = GetCountryCities().cities;
        
            //Zip code can not be empty in order for {order}method/payments to work correctly


        var PhoneNumbers = Backbone.MozuModel.extend({
            defaults : {
                dialingCode: Hypr.getThemeSetting('countrySpecificDialingCode') || '',
            },
            validation: {
                home: {
                    required: true,
                    msg: Hypr.getLabel("phoneMissing")
                }
            }
        }),

        title = Backbone.MozuModel.extend({
            validation: {
                titleName: {
                    required: false,
                    msg: Hypr.getLabel("titleMissing")
                }
            }
        }),

        StreetAddress = Backbone.MozuModel.extend({
            mozuType: 'address',
            initialize: function() {
            },
            clearStateAndZipWhenCountryChanges: function() {
                // this.unset('postalOrZipCode');
                //this.unset('stateOrProvince');
            },
            validation: {
                
                address1: {
                    required: true,
                    msg: Hypr.getLabel("housenumMissing")
                },
                cityOrTown: {
                    required: true,
                    msg: Hypr.getLabel("cityMissing")
                },
                countryCode: {
                    required: true,    
                    msg: Hypr.getLabel("countryMissing")
                },
                address2: {
                    required: true,
                    msg: Hypr.getLabel("areaMissing")
                },
                address3: {
                    required: true,
                    msg: Hypr.getLabel("streetMissing")
                },
                address4: {
                    fn: function(value, attr, computed) {
                        // Only validate if nationalAddressShortCodeRequired is enabled in theme settings
                        var isRequired = HyprLiveContext.locals.themeSettings.nationalAddressShortCodeRequired;
                        if (isRequired) {
                            if (!value) {
                                return Hypr.getLabel("nationalAddressShortCodeMissing");
                            }
                            // Validate format: 4 uppercase letters followed by 4 numbers (e.g., ABCD1234)
                            var shortCodePattern = /^[A-Z]{4}[0-9]{4}$/;
                            if (!shortCodePattern.test(value.toUpperCase())) {
                                return Hypr.getLabel("nationalAddressShortCodeInvalidFormat");
                            }
                        }
                        return null;
                    }
                }
                // stateOrProvince: {
                //     required: true,
                //     fn: "requiresStateAndZip",
                //     msg: Hypr.getLabel("stateProvMissing")
                // },
                //postalOrZipCode: {
                //    required: false,
                //    fn: "requiresStateAndZip",
                //    msg: Hypr.getLabel("postalCodeMissing")
                //}
            },
            requiresStateAndZip: function(value, attr) {
                if ((this.get('countryCode') in countriesRequiringStateAndZip) && !value) return this.validation[attr.split('.').pop()].msg;
            },
            defaults: {
                candidateValidatedAddresses: null,
                countryCode: Hypr.getThemeSetting('countrySpecificCode') || '',
                addressType: 'Residential',
                defaultAddress:false
            },
            toJSON: function(options) {
                // workaround for SA
                var j = Backbone.MozuModel.prototype.toJSON.apply(this, arguments);
                if ((!options || !options.helpers) && !j.stateOrProvince) {
                    j.stateOrProvince = defaultStateProv;
                }
                if (options && options.helpers && j.stateOrProvince === defaultStateProv) {
                    delete j.stateOrProvince;
                }
                if ((!options || !options.helpers) && !j.postalOrZipCode) {
                    j.postalOrZipCode = defaultZipCode;
                }
                if (options && options.helpers && j.postalOrZipCode === defaultZipCode) {
                    delete j.postalOrZipCode;
                }
                if(options && options.helpers) j.countryName = defaultCountryName;

                if(options && options.helpers) j.countryCode = defaultCountryCode;

                if(options && options.helpers) j.cities = defaultCities;

                return j;
            },
            is: function(another) {
                var s1 = '', s2 = '';
                for (var k in another) {
                    if (k === 'isValidated')
                        continue;
                    s1 = (another[k] || '').toLowerCase();
                    s2 = (this.get(k) || '').toLowerCase();
                    if (s1 != s2) {
                        return false;
                    }
                }
                return true;
            }
        });

        return {
            PhoneNumbers: PhoneNumbers,
            StreetAddress: StreetAddress
        };
    });
