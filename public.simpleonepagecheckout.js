/*
** nopCommerce simple one page checkout
*/


var Checkout = {
    loadWaiting: false,
    failureUrl: false,

    init: function(failureUrl) {
        this.loadWaiting = false;
        this.failureUrl = failureUrl;

        //Accordion.disallowAccessToNextSections = true;
    },

    ajaxFailure: function() {
        location.href = Checkout.failureUrl;
    },

    _disableEnableAll: function(element, isDisabled) {
        var descendants = element.find('*');
        $(descendants).each(function() {
            if (isDisabled) {
                $(this).prop("disabled", true);
            } else {
                $(this).prop("disabled", false);
            }
        });

        if (isDisabled) {
            element.prop("disabled", true);
        } else {
            $(this).prop("disabled", false);
        }
    },

    setLoadWaiting: function(step, keepDisabled) {
        var container;
        if (step) {
            if (this.loadWaiting) {
                this.setLoadWaiting(false);
            }
            container = $('#' + step + '-buttons-container');
            container.addClass('disabled');
            container.css('opacity', '.5');
            this._disableEnableAll(container, true);
            $('#' + step + '-please-wait').show();
        } else {
            if (this.loadWaiting) {
                container = $('#' + this.loadWaiting + '-buttons-container');
                var isDisabled = keepDisabled ? true : false;
                if (!isDisabled) {
                    container.removeClass('disabled');
                    container.css('opacity', '1');
                }
                this._disableEnableAll(container, isDisabled);
                $('#' + this.loadWaiting + '-please-wait').hide();
            }
        }
        this.loadWaiting = step;
    },

    gotoSection: function(section) {
        section = $('#opc-' + section);
        section.addClass('allow');
        //Accordion.openSection(section);
    },

    back: function() {
        if (this.loadWaiting) return;
        //Accordion.openPrevSection(true, true);
    },

    setStepResponse: function(response) {
        if (response.update_section) {
            $('#checkout-' + response.update_section.name + '-load').html(response.update_section.html);
        }
        if (response.allow_sections) {
            response.allow_sections.each(function(e) {
                $('#opc-' + e).addClass('allow');
            });
        }

        //TODO move it to a new method
        if ($("#billing-address-select").length > 0) {
            Billing.newAddress(!$('#billing-address-select').val());
        } else {
            Billing.newAddress(true);
        }
        if ($("#shipping-address-select").length > 0) {
            Shipping.newAddress(!$('#shipping-address-select').val());
        }

        if (response.goto_section) {
            Checkout.gotoSection(response.goto_section);
            return true;
        }
        if (response.redirect) {
            location.href = response.redirect;
            return true;
        }
        return false;
    }
};


var Billing = {
    form: false,
    saveUrl: false,
    disableBillingAddressCheckoutStep: false,
    shipToSameAddress: false,
    guest: false,
    selectedStateId: 0,
    callback: false,

    init: function(form, saveUrl, disableBillingAddressCheckoutStep, guest) {
        this.form = form;
        this.saveUrl = saveUrl;
        this.disableBillingAddressCheckoutStep = disableBillingAddressCheckoutStep;
        this.guest = guest;
    },

    toggleShipToSameAddress: function(shipToSameAddressInput) {
        if (shipToSameAddressInput.checked) {
            this.shipToSameAddress = true;

            $('#opc-shipping').hide();
        } else {
            this.shipToSameAddress = false;

            $('#opc-shipping').show();
        }
    },

    newAddress: function(isNew) {
        $('#save-address-button').hide();

        if (isNew) {
            $('#billing-new-address-form').show();
            $('#edit-address-button').hide();
            $('#delete-address-button').hide();
        } else {
            $('#billing-new-address-form').hide();
            if (this.guest) {
                $('#edit-address-button').show();
                $('#delete-address-button').show();
            }
        }
        $(document).trigger({ type: "onepagecheckout_billing_address_new" });
    },

    resetSelectedAddress: function() {
        var selectElement = $('#billing-address-select');
        if (selectElement) {
            selectElement.val('');
        }
        $(document).trigger({ type: "onepagecheckout_billing_address_reset" });
    },

    save: function(callback) {

        this.callback = callback;
        //if (Checkout.loadWaiting !== false) return;

        //Checkout.setLoadWaiting('billing');

        $.ajax({
            cache: false,
            url: this.saveUrl,
            data: $(this.form).serialize(),
            type: "POST",
            success: this.nextStep,
            complete: this.resetLoadWaiting,
            error: Checkout.ajaxFailure
        });
    },

    resetLoadWaiting: function() {
        Checkout.setLoadWaiting(false);
    },

    nextStep: function(response) {
        
        //ensure that response.wrong_billing_address is set
        //if not set, "true" is the default value
        if (typeof response.wrong_billing_address === 'undefined') {
            response.wrong_billing_address = false;
        }

        if (response.wrong_billing_address) {

            Billing.callback(false);

            Checkout.setStepResponse(response);

            return false;
        }

        if (Billing.disableBillingAddressCheckoutStep) {
            if (response.wrong_billing_address) {

                Checkout.setStepResponse(response);
                Billing.initializeCountrySelect();

                Billing.callback(false);

                return false;
                //Accordion.showSection('#opc-billing');
            } else {
                Billing.callback(true);
                //Accordion.hideSection('#opc-billing');
            }
        }

        if (response.error) {
            if (typeof response.message === 'string') {
                alert(response.message);
            } else {
                alert(response.message.join("\n"));
            }

            Billing.callback(false);

            return false;
        }

        Billing.initializeCountrySelect();

        Billing.callback(true);
    },

    initializeCountrySelect: function() {
        if ($('#opc-billing').has('select[data-trigger="country-select"]')) {
            $('#opc-billing select[data-trigger="country-select"]').countrySelect();
        }
    },

    editAddress: function(url) {
        Billing.resetBillingForm();
        //Billing.initializeStateSelect();

        var prefix = 'BillingNewAddress_';
        var selectedItem = $('#billing-address-select').children("option:selected").val();
        $.ajax({
            cache: false,
            type: "GET",
            url: url,
            data: {
                "addressId": selectedItem
            },
            success: function(data, textStatus, jqXHR) {
                $.each(data,
                    function(id, value) {
                        //console.log("id:" + id + "\nvalue:" + value);
                        if (value !== null) {
                            var val = $(`#${prefix}${id}`).val(value);
                            if (id.indexOf('CountryId') >= 0) {
                                val.trigger('change');
                            }
                            if (id.indexOf('StateProvinceId') >= 0) {
                                Billing.setSelectedStateId(value);
                            }
                        }
                    });
            },
            complete: function(jqXHR, textStatus) {
                $('#billing-new-address-form').show();
                $('#edit-address-button').hide();
                $('#delete-address-button').hide();
                $('#save-address-button').show();
            },
            error: Checkout.ajaxFailure
        });
    },

    saveEditAddress: function(url) {
        var selectedId;
        $.ajax({
            cache: false,
            url: url + '?opc=true',
            data: $(this.form).serialize(),
            type: "POST",
            success: function(response) {
                selectedId = response.selected_id;
                Checkout.setStepResponse(response);
                Billing.resetBillingForm();
            },
            complete: function() {
                var selectElement = $('#billing-address-select');
                if (selectElement) {
                    selectElement.val(selectedId);
                }
            },
            error: Checkout.ajaxFailure
        });
    },

    deleteAddress: function(url) {
        var selectedAddress = $('#billing-address-select').children("option:selected").val();
        $.ajax({
            cache: false,
            type: "GET",
            url: url,
            data: {
                "addressId": selectedAddress,
                "opc": 'true'
            },
            success: function(response) {
                Checkout.setStepResponse(response);
            },
            error: Checkout.ajaxFailure
        });
    },

    setSelectedStateId: function(id) {
        this.selectedStateId = id;
    },

    resetBillingForm: function() {
        $(':input', '#billing-new-address-form')
            .not(':button, :submit, :reset, :hidden')
            .removeAttr('checked').removeAttr('selected')
        $(':input', '#billing-new-address-form')
            .not(':checkbox, :radio, select')
            .val('');

        $('.address-id', '#billing-new-address-form').val('0');
        $('select option[value="0"]', '#billing-new-address-form').prop('selected', true);
    }
};

var Shipping = {
    form: false,
    saveUrl: false,
    callback: false,

    init: function (form, saveUrl) {
        this.form = form;
        this.saveUrl = saveUrl;
    },

    newAddress: function (isNew) {
        if (isNew) {
            this.resetSelectedAddress();
            $('#shipping-new-address-form').show();
        } else {
            $('#shipping-new-address-form').hide();
        }
        $(document).trigger({ type: "onepagecheckout_shipping_address_new" });
        Shipping.initializeCountrySelect();
    },

    resetSelectedAddress: function () {
        var selectElement = $('#shipping-address-select');
        if (selectElement) {
            selectElement.val('');
        }
        $(document).trigger({ type: "onepagecheckout_shipping_address_reset" });
    },

    save: function (callback) {

        this.callback = callback;
        //if (Checkout.loadWaiting !== false) return;

        //Checkout.setLoadWaiting('shipping');
        $.ajax({
            cache: false,
            url: this.saveUrl,
            data: $(this.form).serialize(),
            type: "POST",
            success: this.nextStep,
            complete: this.resetLoadWaiting,
            error: Checkout.ajaxFailure
        });
    },

    resetLoadWaiting: function () {
        Checkout.setLoadWaiting(false);
    },

    nextStep: function (response) {
        //ensure that response.wrong_shipping_address is set
        //if not set, "true" is the default value
        if (typeof response.wrong_shipping_address === 'undefined') {
            response.wrong_shipping_address = false;
        }
        if (response.wrong_shipping_address) {
            Checkout.setStepResponse(response);

            Shipping.callback(false);

            return false;
        }

        if (response.error) {
            if (typeof response.message === 'string') {
                alert(response.message);
            } else {
                alert(response.message.join("\n"));
            }

            Shipping.callback(false);

            return false;
        }

        Shipping.callback(true);

        //Checkout.setStepResponse(response);
    },

    initializeCountrySelect: function () {
        if ($('#opc-shipping').has('select[data-trigger="country-select"]')) {
            $('#opc-shipping select[data-trigger="country-select"]').countrySelect();
        }
    }
};



var ShippingMethod = {
    form: false,
    saveUrl: false,
    localized_data: false,
    callback: false,

    init: function (form, saveUrl, localized_data) {
        this.form = form;
        this.saveUrl = saveUrl;
        this.localized_data = localized_data;

        this.save(function(){});
    },

    validate: function () {
        var methods = document.getElementsByName('shippingoption');
        if (methods.length === 0) {
            alert(this.localized_data.NotAvailableMethodsError);
            return false;
        }

        for (var i = 0; i < methods.length; i++) {
            if (methods[i].checked) {
                return true;
            }
        }
        alert(this.localized_data.SpecifyMethodError);
        return false;
    },

    selectShippingOption: function () {
        $('input[name=shippingoption]:checked', this.form).trigger('change');
    },

    save: function (callback) {

        this.callback = callback;
        //if (Checkout.loadWaiting !== false) return;

        if (this.validate()) {
            Checkout.setLoadWaiting('shipping-method');

            $.ajax({
                cache: false,
                url: this.saveUrl,
                data: $(this.form).serialize(),
                type: "POST",
                success: this.nextStep,
                complete: this.resetLoadWaiting,
                error: Checkout.ajaxFailure
            });
        }
    },

    resetLoadWaiting: function () {
        Checkout.setLoadWaiting(false);
    },

    nextStep: function (response) {
        if (response.error) {
            if (typeof response.message === 'string') {
                alert(response.message);
            } else {
                alert(response.message.join("\n"));
            }

            ShippingMethod.callback(false);

            return false;
        }

        ShippingMethod.callback(true);

        //Checkout.setStepResponse(response);
    }
};



var PaymentMethod = {
    form: false,
    saveUrl: false,
    localized_data: false,
    callback: false,

    init: function (form, saveUrl, localized_data) {
        this.form = form;
        this.saveUrl = saveUrl;
        this.localized_data = localized_data;

        this.save(function () { });
    },

    toggleUseRewardPoints: function (useRewardPointsInput) {
        if (useRewardPointsInput.checked) {
            $('#payment-method-block').hide();
        }
        else {
            $('#payment-method-block').show();
        }
    },

    selectPaymentMethod: function () {
        $('input[name=paymentmethod]:checked', this.form).trigger('change');
    },

    validate: function () {
        var methods = document.getElementsByName('paymentmethod');
        if (methods.length === 0) {
            alert(this.localized_data.NotAvailableMethodsError);
            return false;
        }

        for (var i = 0; i < methods.length; i++) {
            if (methods[i].checked) {
                return true;
            }
        }
        alert(this.localized_data.SpecifyMethodError);
        return false;
    },

    save: function (callback) {

        this.callback = callback;
        //if (Checkout.loadWaiting !== false) return;
        
        if (this.validate()) {
            Checkout.setLoadWaiting('payment-method');
            $.ajax({
                cache: false,
                url: this.saveUrl,
                data: $(this.form).serialize(),
                type: "POST",
                success: this.nextStep,
                complete: this.resetLoadWaiting,
                error: Checkout.ajaxFailure
            });
        }
    },

    resetLoadWaiting: function () {
        Checkout.setLoadWaiting(false);
    },

    nextStep: function (response) {
        if (response.error) {
            if (typeof response.message === 'string') {
                alert(response.message);
            } else {
                alert(response.message.join("\n"));
            }

            PaymentMethod.callback(false);

            return false;
        }

        PaymentMethod.callback(true);

        Checkout.setStepResponse(response);
    }
};



var PaymentInfo = {
    form: false,
    saveUrl: false,
    callback: false,

    init: function (form, saveUrl) {
        this.form = form;
        this.saveUrl = saveUrl;
    },

    save: function (callback) {
        this.callback = callback;
        //if (Checkout.loadWaiting !== false) return;

        Checkout.setLoadWaiting('payment-info');
        $.ajax({
            cache: false,
            url: this.saveUrl,
            data: $(this.form).serialize(),
            type: "POST",
            success: this.nextStep,
            complete: this.resetLoadWaiting,
            error: Checkout.ajaxFailure
        });
    },

    resetLoadWaiting: function () {
        Checkout.setLoadWaiting(false);
    },

    nextStep: function (response) {
        //ensure that response.wrong_shipping_address is set
        //if not set, "true" is the default value
        if (typeof response.wrong_payment_info === 'undefined') {
            response.wrong_payment_info = false;
        }
        if (response.wrong_payment_info) {
            Checkout.setStepResponse(response);

            PaymentInfo.callback(false);
            
            return false;
        }

        if (response.error) {
            if (typeof response.message === 'string') {
                alert(response.message);
            } else {
                alert(response.message.join("\n"));
            }

            PaymentInfo.callback(false);

            return false;
        }
        
        PaymentInfo.callback(true);
    }
};



var ConfirmOrder = {
    form: false,
    saveUrl: false,
    isSuccess: false,
    termOfServiceOk: true,

    init: function (saveUrl, successUrl) {
        this.saveUrl = saveUrl;
        this.successUrl = successUrl;
    },

    save: function () {
        //if (Checkout.loadWaiting !== false) return;
        
        //terms of service
        //var termOfServiceOk = true;
        if ($('#termsofservice').length > 0) {
            //terms of service element exists
            if (!$('#termsofservice').is(':checked')) {
                $("#terms-of-service-warning-box").dialog();
                this.termOfServiceOk = false;
            } else {
                this.termOfServiceOk = true;
            }
        }

        if (!this.termOfServiceOk)
            return false;

        Billing.save(function (resultBilling) {

            if (resultBilling) {

                if (!Billing.shipToSameAddress) {
                    Shipping.save(function(resultShipping) {
                        if (resultShipping) {
                            
                            ShippingMethod.save(function(resultShippingMethod) {
                                if (resultShippingMethod) {

                                    PaymentMethod.save(function(resultPayment) {
                                        if (resultPayment) {

                                            PaymentInfo.save(function(resultPaymentInfo) {
                                                if (resultPaymentInfo) {

                                                    if (ConfirmOrder.termOfServiceOk) {
                                                        Checkout.setLoadWaiting('confirm-order');
                                                        $.ajax({
                                                            cache: false,
                                                            url: ConfirmOrder.saveUrl,
                                                            type: "POST",
                                                            success: ConfirmOrder.nextStep,
                                                            complete: ConfirmOrder.resetLoadWaiting,
                                                            error: Checkout.ajaxFailure
                                                        });
                                                    } else {
                                                        return false;
                                                    }
                                                }

                                                return false;
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else {
                    if (ConfirmOrder.termOfServiceOk) {
                        //Checkout.setLoadWaiting('confirm-order');
                        
                        ShippingMethod.save(function(resultShippingMethod) {
                            if (resultShippingMethod) {

                                PaymentMethod.save(function (resultPayment) {
                                    if (resultPayment) {

                                        PaymentInfo.save(function(resultPaymentInfo) {
                                            if (resultPaymentInfo) {
                                                
                                                if (ConfirmOrder.termOfServiceOk) {
                                                    Checkout.setLoadWaiting('confirm-order');
                                                    $.ajax({
                                                        cache: false,
                                                        url: ConfirmOrder.saveUrl,
                                                        type: "POST",
                                                        success: ConfirmOrder.nextStep,
                                                        complete: ConfirmOrder.resetLoadWaiting,
                                                        error: Checkout.ajaxFailure
                                                    });
                                                } else {
                                                    return false;
                                                }
                                            }

                                            return false;
                                        });
                                    }
                                });
                            }
                        });
                    } else {
                        return false;
                    }
                }
            }
        });

        return false;
    },

    resetLoadWaiting: function (transport) {
        Checkout.setLoadWaiting(false, ConfirmOrder.isSuccess);
    },

    nextStep: function (response) {
        if (response.error) {
            if (typeof response.message === 'string') {
                alert(response.message);
            } else {
                alert(response.message.join("\n"));
            }

            return false;
        }

        if (response.redirect) {
            ConfirmOrder.isSuccess = true;
            location.href = response.redirect;
            return;
        }
        if (response.success) {
            ConfirmOrder.isSuccess = true;
            window.location = ConfirmOrder.successUrl;
        }

        Checkout.setStepResponse(response);
    }
};