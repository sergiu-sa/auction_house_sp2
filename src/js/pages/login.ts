// Load Tailwind for THIS page
import "../../styles/style.css";

import { getGuestNavbarHTML, mountNavbar } from "../ui/navbar";

mountNavbar("#navbar", getGuestNavbarHTML());
