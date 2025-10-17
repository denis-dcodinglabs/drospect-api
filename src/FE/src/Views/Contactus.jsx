import React, { useState } from "react";
import Textarea from "../components/formComponents/Textarea";
import Input from "../components/formComponents/Input";
import { useForm, Controller } from "react-hook-form";
import axios from "../axiosInstance"; // Import Axios
import Button from "../components/formComponents/Button";
// import ContactUsLine from '../assets/icons/ContactUsLine';
import Title from "../components/Title";
import { toast } from "react-toastify";
import LineContact from "../assets/icons/LineInContact";

const ContactUs = () => {
  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await axios.contactUs(data);
      setLoading(false);
      toast.success(response.message);
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <div className=" w-full flex justify-center items-center" id="book-a-demo">
      <div className="absolute w-full bottom-0 -z-10 ">
        <LineContact />
      </div>
      <div className="rounded-lg py-20 px-2 sm:px-10  z-10 w-full lg:w-2/5 ">
        <div data-aos="fade-up">
          <Title title={"Book a Demo"} className="py-4" />
        </div>

        <div
          data-aos="fade-right"
          data-aos-offset="300"
          data-aos-easing="ease-in-sine"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="text-white">
            <Input
              name="Name"
              id="name"
              type="text"
              placeholder={"Your Name"}
              register={register}
              errors={errors}
              options={{
                required: "Name is required",
              }}
              className="w-full px-2 py-3 text-lg text-gray-400 rounded-lg border border-solid border-gray-700 focus:border-pink-600  focus:outline-none  bg-primary mb-2"
            />
            <Input
              name="Email"
              id="email"
              type="email"
              placeholder="Your Email"
              register={register}
              errors={errors}
              options={{
                required: "Email is required",
              }}
              className="w-full px-2 py-3 text-lg text-gray-400 rounded-lg border border-solid border-gray-700 focus:border-pink-600  focus:outline-none  bg-primary mb-2"
            />
            <Controller
              name="message"
              className="w-full mb-4 input-focus bg-white border border-gray-300 px-6 py-2 rounded"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Textarea
                  label="Message"
                  placeholder="Your Message Here"
                  control={control}
                  errors={errors}
                  id={field.name}
                />
              )}
            />
            <div className="mb-12 pb-1 pt-1 text-center w-full">
              <Button
                className="rounded-lg px-5 items-center h-14 w-full"
                text="Send Message"
                style={{
                  background:
                    "linear-gradient(#40415A,#40415A) padding-box, linear-gradient(to right, #FF6B00 0%, #DD0077 55%, #7000FF 100%) border-box",
                }}
                disabled={loading}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
