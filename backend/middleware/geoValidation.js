const validateGeoJSON = (req, res, next) => {
    const { coordinates } = req.body;
    
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ message: 'Invalid coordinates format' });
    }
  
    if (Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90) {
      return res.status(400).json({ message: 'Invalid coordinate values' });
    }
  
    next();
  };
  
  module.exports = { validateGeoJSON };
  