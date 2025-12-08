from django.test import TestCase
from users.models import User
from adminpanel.services import UserValidationService

class UserValidationServiceTest(TestCase):
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='agente'
        )
    
    def test_check_duplicate_user(self):
        # Test duplicados
        errors = UserValidationService.check_duplicate_user('testuser', 'test2@example.com')
        self.assertIn('username', errors)
        
        errors = UserValidationService.check_duplicate_user('newuser', 'test@example.com')
        self.assertIn('email', errors)
    
    def test_check_duplicate_user_exclude(self):
        # Test excluyendo usuario actual
        errors = UserValidationService.check_duplicate_user(
            'testuser', 'test@example.com', self.user.id
        )
        self.assertEqual(len(errors), 0)
    
    def test_validate_username_availability(self):
        self.assertFalse(UserValidationService.validate_username_availability('testuser'))
        self.assertTrue(UserValidationService.validate_username_availability('newuser'))
    
    def test_get_suggested_username(self):
        suggestions = UserValidationService.get_suggested_username('testuser')
        self.assertEqual(len(suggestions), 5)
        self.assertTrue(all(sug.startswith('testuser') for sug in suggestions))
