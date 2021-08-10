using Nop.Web.Framework.Models;
using Nop.Web.Models.ShoppingCart;

namespace Nop.Web.Models.Checkout
{
    public partial record OnePageCheckoutModel : BaseNopModel
    {
        public OnePageCheckoutModel()
        {
            BillingAddress = new CheckoutBillingAddressModel();
            ShippingAddress = new CheckoutShippingAddressModel();
            ShippingMethod = new CheckoutShippingMethodModel();
            PaymentMethod = new CheckoutPaymentMethodModel();
            ShoppingCart = new ShoppingCartModel();
            ConfirmOrder = new CheckoutConfirmModel();
        }

        public bool ShippingRequired { get; set; }
        public bool DisableBillingAddressCheckoutStep { get; set; }

        public CheckoutBillingAddressModel BillingAddress { get; set; }

        public CheckoutShippingAddressModel ShippingAddress { get; set; }

        public CheckoutShippingMethodModel ShippingMethod { get; set; }
        
        public bool IsPaymentWorkflowRequired { get; set; }

        public CheckoutPaymentMethodModel PaymentMethod { get; set; }
        
        //public ShoppingCartModel.DiscountBoxModel DiscountBox { get; set; }

        //public CheckoutOrderReviewModel OrderReview { get; set; }

        public ShoppingCartModel ShoppingCart { get; set; }

        public CheckoutConfirmModel ConfirmOrder { get; set; }
    }
}