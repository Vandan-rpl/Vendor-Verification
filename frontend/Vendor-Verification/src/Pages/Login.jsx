import { Formik, Form, Field, ErrorMessage } from "formik";
import loginValidation from "../Validation/loginValidation";
import { loginUser } from "../Services/authServices";
import toast from "react-hot-toast";
import { useAuth } from "../Context/authContext";
import { useNavigate } from "react-router-dom";
import Dashboard from "./Dashboard";

function Login() {
  const initialValues = {
    email: "",
    password: "",
  };

  const {login,setIsAuthenticated,isAuthenticated} = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const response = await loginUser(values);

      toast.success("Login successful!");

      resetForm();
      navigate("/");
      login();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {!isAuthenticated ? (
          <div className="w-full max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100">
        <h2 className="text-2xl font-bold text-center mb-6 tracking-tight text-slate-800">
          Login
        </h2>

        <Formik
          initialValues={initialValues}
          validationSchema={loginValidation}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-5">
              {/* Email Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-600">
                  Email
                </label>
                <Field
                  type="email"
                  name="email"
                  placeholder="Enter email"
                  className="w-full px-4 py-2.5 bg-slate-50 text-slate-900 rounded-lg border border-slate-200 placeholder-slate-400 transition-all duration-200 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <ErrorMessage
                  name="email"
                  component="div"
                  className="text-sm text-red-500 mt-1 pl-1 font-medium"
                />
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-600">
                  Password
                </label>
                <Field
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  className="w-full px-4 py-2.5 bg-slate-50 text-slate-900 rounded-lg border border-slate-200 placeholder-slate-400 transition-all duration-200 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <ErrorMessage
                  name="password"
                  component="div"
                  className="text-sm text-red-500 mt-1 pl-1 font-medium"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {isSubmitting ? "Logging in..." : "Login"}
              </button>
            </Form>
          )}
        </Formik>
      </div>
      ):(
        <Dashboard />
      )}
    </>
  );
}

export default Login;
