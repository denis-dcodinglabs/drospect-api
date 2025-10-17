import { useState, useEffect } from "react";
import { CheckoutForm } from "../../components/Payments";
import ModalLayout from "../../components/ModalLayout";
import Button from "../../components/formComponents/Button";
import axiosInstance from "../../axiosInstance";
import { useSelector, useDispatch } from "react-redux";
import { updateWallet } from "../../Redux/features/user/userSlice";
import ReusableTable from "../../components/ReusableTable";

const Credits = () => {
  const credits = useSelector(
    (state) => state.userReducer.wallet?.credits || 0,
  );
  const [clickToPay, setClickToPay] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [transactionsHistory, setTransactionsHistory] = useState([]);
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [customAmount, setCustomAmount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const dispatch = useDispatch();

  useEffect(() => {
    fetchTransactions();
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const response = await axiosInstance.getData("/wallet/me");
      dispatch(updateWallet(response?.data));
    } catch (err) {
      setError("Failed to fetch wallet information");
      console.error("Error fetching wallet:", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const [paymentsResponse, transactionResponse] = await Promise.all([
        axiosInstance.getData("/payments/me"),
        axiosInstance.getData("/transaction"),
      ]);

      setTransactionsHistory(transactionResponse?.data || []);
      setPaymentsHistory(paymentsResponse || []);
    } catch (err) {
      setError("Failed to fetch transaction history");
      console.error("Error fetching transactions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomAmountChange = (e) => {
    const amount = parseFloat(e.target.value);
    if (!isNaN(amount) && amount >= 1) {
      setCustomAmount(amount);
    } else {
      setCustomAmount(1); // Ensure the amount is at least 1
    }
  };

  const handleCustomAmountSubmit = () => {
    setSelectedOffer({
      name: "Custom Offer",
      price: customAmount,
    });
    setClickToPay(true);
  };

  const columns = [
    { header: "Credits", accessor: "credits" },
    {
      header: "Status",
      accessor: "status",
      Cell: ({ value }) => (
        <span
          className={`py-3 capitalize px-4 ${
            value === "success" ? "text-green-500" : "text-red-500"
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      header: "Date",
      accessor: "updatedAt",
      Cell: ({ value }) => new Date(value).toLocaleDateString("en-US"),
    },
  ];

  const transactionColumns = [
    { header: "Credits", accessor: "credits" },
    { header: "Project", accessor: "projectName" },
    { header: "Inspected Panels", accessor: "inspectedPanels" },
    {
      header: "Created At",
      accessor: "createdAt",
      Cell: ({ value }) => new Date(value).toLocaleDateString("en-US"), // Format the date
    },
  ];

  return (
    <div className="px-4 w-full lg:flex justify-center items-start">
      <ModalLayout
        open={clickToPay}
        handleClose={() => setClickToPay((prev) => !prev)}
        className=" w-full md:w-[70%] !bg-primary "
      >
        <CheckoutForm offer={selectedOffer} />
      </ModalLayout>
      <div className=" xl:w-[65%]">
        <div className="py-10 space-y-8">
          <div className="text-4xl font-bold text-white">Credits</div>
          <div className="bg-primary p-6 rounded-lg text-center border-[8px] border-gray-700">
            <div
              className="text-2xl font-semibold border-hidden text-white animate-pulse"
              style={{
                animationDuration: "1.5s",
              }}
            >
              Available Credits
            </div>

            <div
              className="text-6xl border-hidden font-bold text-[#FC620A] animate-pulse"
              style={{
                animationDuration: "1.5s",
                animationTimingFunction: "ease-in-out",
              }}
            >
              {credits}
            </div>

            <div className="text-sm text-gray-400">
              You can use your credits to make panel inspection.
            </div>
          </div>
        </div>

        <div className=" md:flex flex-grow  gap-4">
          <div className="bg-primary w-full my-4 p-6 rounded-lg shadow-lg text-center flex flex-col items-center border border-gray-700 hover:border-[#FC620A] group transition-all">
            <div className="text-3xl font-bold pb-4 text-white group-hover:text-[#FC620A]">
              Custom Amount
            </div>
            <div className=" flex flex-col gap-5 md:w-96">
              <div className="">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className="text-xl text-white text-right p-2 border bg-[#190B33] border-gray-400 rounded-md  [appearance:textfield] 
               [&::-webkit-inner-spin-button]:m-1.5 
               [&::-webkit-outer-spin-button]:m-1.5"
                  placeholder="Enter amount in €"
                />
                <span className="text-xl text-white ml-2">€</span>
              </div>
              <p className="text-base text-gray-400">
                You will receive{" "}
                <span className="text-[#FC620A]">
                  {Math.floor(customAmount * 10)}
                </span>{" "}
                credits for €{customAmount}. With these credits, you can inspect{" "}
                <span className="text-[#FC620A]">
                  {Math.floor(customAmount * 10)}
                </span>{" "}
                images in <span className="text-blue-500">high altitude</span>{" "}
                and{" "}
                <span className="text-[#FC620A]">
                  {Math.floor(customAmount * 5)}
                </span>{" "}
                images in <span className="text-green-500">low altitude</span>.
              </p>
              <Button
                className="mt-4 px-4 py-2 rounded-md text-lg  font-medium text-white"
                onClick={handleCustomAmountSubmit}
                text={"Buy Now"}
              ></Button>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-8 px-4">
        {error && <div className="text-red-500 text-center">{error}</div>}
        {isLoading ? (
          <div className="text-white text-center">Loading...</div>
        ) : (
          <>
            {transactionsHistory?.length > 0 && (
              <ReusableTable
                columns={transactionColumns}
                data={transactionsHistory}
              />
            )}
            {paymentsHistory?.length > 0 && (
              <ReusableTable columns={columns} data={paymentsHistory} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Credits;
