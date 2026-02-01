import { signup } from "../utils/api.js";

(async () => {
  const result = await signup("test@example.com", "StrongPass123", "Aryan");
  if (result.error) {
    console.error("Signup failed:", result.error.message);
  } else {
    console.log("Signed up user:", result.user);
  }
})();