const router = require('express').Router();
const ctrl = require('../controllers/postController');
const { authenticate } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

// Posts are visible to everyone
router.get('/', ctrl.list);
router.get('/user/:userId', validateObjectId('userId'), ctrl.byUser);

// Writing requires a logged-in user.
router.post('/', authenticate, ctrl.create);

module.exports = router;
