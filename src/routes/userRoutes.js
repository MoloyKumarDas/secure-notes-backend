const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.use(authenticate, authorize('admin'));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/grouped-by-interests', ctrl.groupedByInterests);
router.get('/:id', validateObjectId('id'), ctrl.getOne);
router.put('/:id', validateObjectId('id'), ctrl.update);
router.delete('/:id', validateObjectId('id'), ctrl.remove);

module.exports = router;
