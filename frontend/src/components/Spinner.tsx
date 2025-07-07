import { Square } from 'ldrs/react';
import 'ldrs/react/Square.css';

const Spinner = () => {
  return (
    // <Hatch
    //   size="33"
    //   stroke="6"
    //   speed="5.1"
    //   color="grey"
    // />

    // Default values shown
    <Square
      size="35"
      stroke="5"
      stroke-length="0.25"
      bg-opacity="0.1"
      speed="1.2"
      color="grey"
    ></Square>
  );
};

export default Spinner;