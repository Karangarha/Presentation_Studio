# Purpose:
* THIS IS A PRESENTATION WEBSITE, DISPLAYED ON THE TV'S VIA WEBPAGE.

## WHAT I WANT TO DO WITH IT:

* IT WILL HAVE A BACKROUND IMAGE THAT I WILL PROVIDE AND CAN BE UPLOADED THROUGH THE *** BACKEND ***
* CAROUSEL THAT WILL DISPLAY THE CARDS THAT WILL CONTATIN THE INFOMATION REGARDING THE STUDENT(SET IN SUPABASE MIGRATIONS). THE INFOMATION WILL BE UPLOADED VIA A *** BACKEND *** CONTAINING INFORMATION LIKE YEAR OF GRADUATE, IMAGE(I WILL SET A CDN JUST TELL ME WHEN YOU NEED IT), NAME, COMANY AND LOGO( IF AVILABLE). 
* THE CAROUSEL CARDS WILL BE GLASS LOOKING

### BACKEND:

* THE ADMIN CAN UPLOAD EACH STUDENT A TIME WITH RELEVENT INFORMATION, ALSO CAN UPLOAD A EXCEL SHEET WITH THE APPROPRATE INFORMATION, THE EXCEL SHEET WILL CONTIAN A SECTION FOR IMAGES THAT WILL HAVE INFORMATION OF THE IMAGE NAME, SINCE MULTI IMAGES CAN BE UPLOADED AT SAME TIME.

* THE ADMIN CAN EDIT THE INFORMATION OF EACH STUDENT INDIVIUALLY AND THAT INFORMATION WILL BE REALTIME, SOMETHING CHANGED EFFECTS THE WEBPAGE WITHOUT RELOAD.

* THE SPEED OF THE CAROUSEL CAN BE CHANGED AS PER REQUIREMENTS.

* ADMIN CAN SET THE ORDER OF THE DISPLAY

# Overall Carousel Architecture
The carousel utilizes a horizontal, symmetrical "coverflow" or focal-point layout, displaying seven continuous cards. The structure relies on progressive scaling rather than a standard flat scroll to establish visual hierarchy and simulated depth.

## Card Sizing and Depth (Visual Hierarchy)
* **Center Card (Active State):** Anchors the component at maximum scale, acting as the primary focal point in the foreground.
* **Flanking Cards (Inactive States):** The three cards on either side mirror each other, progressively decreasing in height, width, and internal spacing as they approach the left and right outer margins.
* **Z-Index Simulation:** The progressive scaling creates a 3D perspective, drawing the user's eye to the center while keeping peripheral options visible but receded.

## Individual Card Anatomy
Each structural unit is a vertical rectangle with rounded corners and a solid, monochromatic background. Internal elements are strictly center-aligned on the y-axis and stacked in the following vertical order:
1. **Top Metadata:** A brief text label ("Year").
2. **Media Placeholder:** A prominent, perfectly circular container designed for an avatar or profile image.
3. **Primary Identifiers:** Two stacked text strings ("Name" followed by "Company").
4. **Footer Element:** A final text label ("Logo"). *Structural note: This footer drops out of the visual hierarchy on the smallest, outermost cards due to scale constraints.*

## Implementation Notes
For the interactive build-out within a React component architecture, establishing this structure with responsive flex or grid containers using Tailwind CSS utility classes will effectively maintain the baseline alignment. Implementing the active-state shifts with Framer Motion can efficiently handle the dynamic scale, smooth layout transitions, and z-index recalculations as users navigate between the focal cards.

