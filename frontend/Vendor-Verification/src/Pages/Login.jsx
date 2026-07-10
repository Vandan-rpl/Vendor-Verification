import { Formik, Form, Field, ErrorMessage } from "formik";
import loginValidation from "../Validation/loginValidation";
import { loginUser } from "../Services/authServices";
import toast from "react-hot-toast";

function Login() {
  const initialValues = {
    email: "",
    password: "",
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const response = await loginUser(values);

      toast.success("Login successful!");

      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <>
      <div
        style={{
          width: "400px",
          margin: "80px auto",
          padding: "30px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <h2 style={{ textAlign: "center" }}>Login</h2>

        <Formik
          initialValues={initialValues}
          validationSchema={loginValidation}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form>
              <div style={{ marginBottom: "15px" }}>
                <label>Email</label>

                <Field
                  type="email"
                  name="email"
                  placeholder="Enter email"
                  style={{
                    width: "100%",
                    padding: "10px",
                    marginTop: "5px",
                  }}
                />

                <ErrorMessage
                  name="email"
                  component="div"
                  style={{ color: "red", fontSize: "14px" }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label>Password</label>

                <Field
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  style={{
                    width: "100%",
                    padding: "10px",
                    marginTop: "5px",
                  }}
                />

                <ErrorMessage
                  name="password"
                  component="div"
                  style={{ color: "red", fontSize: "14px" }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: "12px",
                  cursor: "pointer",
                }}
              >
                {isSubmitting ? "Logging in..." : "Login"}
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </>
  );
}

export default Login;
