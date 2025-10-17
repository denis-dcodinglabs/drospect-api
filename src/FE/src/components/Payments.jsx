// src/components/Payments.jsx
import React, { useCallback, useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import axiosInstance from "../axiosInstance";
import { useDispatch } from "react-redux";
import { updateWallet } from "../Redux/features/user/userSlice";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

export const CheckoutForm = ({ offer }) => {
  const [clientSecret, setClientSecret] = useState(null);

  const createPayment = useCallback(async () => {
    try {
      const response = await axiosInstance.postData("/payments", {
        credits: Math.floor(offer.price * 10),
        status: "pending",
      });
      return response.id;
    } catch (error) {
      console.error("Error creating payment:", error);
      throw error;
    }
  }, [offer.price]);

  const fetchClientSecret = useCallback(async () => {
    const paymentId = await createPayment();
    const data = await axiosInstance.postData(
      "/stripe/create-checkout-session",
      {
        price: offer.price,
        name: offer.name,
        description: "Custom credit purchase",
        paymentId,
      },
    );
    setClientSecret(data.clientSecret);
  }, [offer]);

  useEffect(() => {
    fetchClientSecret();
  }, [fetchClientSecret]);

  if (!clientSecret) return <p>Loading checkout...</p>;
  return (
    <div id="checkout" className="w-full border-2 border-white">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ clientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
};

export const Return = () => {
  const [status, setStatus] = useState(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [wallet, setWallet] = useState(null);
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const sessionId = urlParams.get("session_id");
  const paymentId = urlParams.get("payment_id");
  const dispatch = useDispatch();

  useEffect(() => {
    const verifyPayment = async () => {
      if (sessionId && paymentId) {
        try {
          const response = await axiosInstance.postData(
            `/stripe/verify-payment`,
            {
              sessionId,
              paymentId,
            },
          );
          if (response.session.status === "complete") {
            window.location.href = "/admin/credits";
          }
          setStatus(response.session.status);
          setCustomerEmail(response.session.customer_email);
          setWallet(response.wallet);
          dispatch(updateWallet(response.wallet));
        } catch (error) {
          console.error("Error fetching session status:", error);
        }
      }
    };

    verifyPayment();
  }, []);

  if (status === "complete") {
    return (
      <section id="success">
        <p>
          We appreciate your business! A confirmation email will be sent to{" "}
          {customerEmail}. If you have any questions, please email{" "}
          <a href="mailto:info@drospect.ai">info@drospect.ai</a>.
        </p>
        <p>Your wallet has been updated with {wallet.credits} credits.</p>
      </section>
    );
  }
  return null;
};

const Payments = () => {
  return (
    <>
      <p>
        This is the Payments wrapper — you can use CheckoutForm or Return
        directly.
      </p>
    </>
  );
};

export default Payments;
