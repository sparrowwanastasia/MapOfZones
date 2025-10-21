import MapComponent from "../components/MapComponent/MapComponent"; // Adjust the path as necessary to point to your Map component file.  This is where you will render the map.  You can also pass props to this component if needed.  For example, you might want to pass in the user's current location or a list of locations to display on the map.  You can also handle events in this component, such as when the user clicks on a location on the map.  The MapComponent should be a separate file
import Header from "../components/Header/Header";

function Main() {
  return (
    <div>
      <Header />
      <MapComponent />{" "}
    </div>
  );
}

export default Main;
