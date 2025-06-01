from flask import Flask, render_template, redirect, url_for, flash, session, request
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Email, Length, EqualTo
from flask_wtf.csrf import CSRFProtect
from flask_mysqldb import MySQL
import bcrypt
import pymysql
from admin import init_admin
# from models import Coin, db
app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change this to a strong secret key
csrf = CSRFProtect(app)
# MySQL Configuration
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'Admin2025'
app.config['MYSQL_DB'] = 'cryptex_test'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'
mysql = MySQL(app)
# Initialize admin blueprint with MySQL instance
admin_bp = init_admin(mysql)
app.register_blueprint(admin_bp)
# Forms
class RegisterForm(FlaskForm):
    username = StringField('Username', validators=[
        DataRequired(),
        Length(min=4, max=20, message='Username must be between 4-20 characters')
    ])
    email = StringField('Email', validators=[
        DataRequired(),
        Email(message='Invalid email address')
    ])
    password = PasswordField('Password', validators=[
        DataRequired(),
        Length(min=8, message='Password must be at least 8 characters')
    ])
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(),
        EqualTo('password', message='Passwords must match')
    ])
    submit = SubmitField('Register')
class LoginForm(FlaskForm):
    email = StringField('Email', validators=[
        DataRequired(),
        Email(message='Invalid email address')
    ])
    password = PasswordField('Password', validators=[
        DataRequired()
    ])
    submit = SubmitField('Login')
# Routes
@app.route('/')
def home():
    print("Homepage route hit")
    return render_template('index.html')
@app.route('/register', methods=['GET', 'POST'])
def register():
    print("Register route hit" )
    form = RegisterForm()
    if form.validate_on_submit():
        print("Form data:", request.form)  # Debug form data
        try:
            username = form.username.data
            email = form.email.data
            password = form.password.data
            # Hash password
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            print(f"Hashed password: {hashed_password}")  # Debug hashed password
            # Check if user exists
            cursor = mysql.connection.cursor()
            cursor.execute("SELECT * FROM user WHERE email = %s OR username = %s", (email, username))
            user = cursor.fetchone()
            print(f"User exists check: {user}")  # Debug user exists check
            if user:
                flash('Email or username already exists', 'danger')
                return redirect(url_for('login'))
            # Create new user
            cursor.execute(
                "INSERT INTO user (username, email, password) VALUES (%s, %s, %s)",
                (username, email, hashed_password)
            )
            mysql.connection.commit()
            print(f"Rows affected: {cursor.rowcount}")  #line to debug database errors
            cursor.close()
            
            flash('Registration successful! Please login.', 'success')
            return redirect(url_for('login'))
           
        except pymysql.Error as e:
            print(f"Database error: {e}")  # line to debug database errors
            mysql.connection.rollback()
            flash('Database error occurred. Please try again.', 'danger')
            return redirect(url_for('register'))
    return render_template('register.html', form=form)
@app.route('/login', methods=['GET', 'POST'])
def login():
    print("Login route hit" )
    form = LoginForm()
    if form.validate_on_submit():
        
        try:
            email = form.email.data
            password = form.password.data
            # Get user from database
            cursor = mysql.connection.cursor()
            cursor.execute("SELECT * FROM user WHERE email = %s", (email,))
            user = cursor.fetchone()
            cursor.close()
            if user and bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
                # Set session variables
                session['user_id'] = user['id']
                session['username'] = user['username']
                session['email'] = user['email']
                
                flash('Login successful!', 'success')
                return redirect(url_for('home'))
            else:
                flash('Invalid email or password', 'danger')
        except pymysql.Error as e:
            flash('Database error occurred. Please try again.', 'danger')
    return render_template('login.html', form=form)
@app.route('/logout')
def logout():
    print("Logout route hit" )
    # Clear session
    session.clear()
    flash('You have been logged out', 'info')
    return redirect(url_for('home'))
# Other routes (market, trade, etc.)
@app.route('/market')
def market():
    print("Hello 5" )
    if 'user_id' not in session:
        flash('Please login to access this page', 'warning')
        return redirect(url_for('login'))
    return render_template('market.html')
@app.route('/trade')
def trade():
    print("Trade route hit" )
    # coins = Coin.query.all()
    
    if 'user_id' not in session:
        flash('Please login to access this page', 'warning')
        return redirect(url_for('login'))
    print('trade login')
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM cryptocurrency")
    coins = cursor.fetchall()
    cursor.close()
    print('select coin from database')
    return render_template('trade.html',coins=coins)
from flask import request
# To save transaction history
from flask import request, jsonify, redirect, url_for, flash
from decimal import Decimal
@app.route('/place_order', methods=['POST'])
def place_order():
    print('place_order route hit')
    if 'user_id' not in session:
        flash('Please login to place an order.', 'warning')
        return redirect(url_for('login'))
    try:
        # Get form data
        crypto_id = request.form.get('crypto_id')
        trade_type = request.form.get('trade_type')
        amount = Decimal(request.form.get('amount', 0))
        quantity = Decimal(request.form.get('quantity', 0))
        payment_method = request.form.get('payment_method')
        # Validate inputs
        if not all([crypto_id, trade_type, payment_method]):
            flash('All fields are required', 'danger')
            return redirect(url_for('trade'))
        if amount <= 0 or quantity <= 0:
            flash('Amount and quantity must be positive values', 'danger')
            return redirect(url_for('trade'))
        if trade_type not in ['buy', 'sell']:
            flash('Invalid transaction type', 'danger')
            return redirect(url_for('trade'))
        user_id = session['user_id']
        cursor = mysql.connection.cursor()
        # Verify cryptocurrency exists
        cursor.execute("SELECT id, symbol FROM cryptocurrency WHERE id = %s", (crypto_id,))
        crypto = cursor.fetchone()
        if not crypto:
            flash('Invalid cryptocurrency selected', 'danger')
            return redirect(url_for('trade'))
        # For sell orders, check if user has enough balance
        if trade_type == 'sell':
            cursor.execute("""
                SELECT SUM(quantity) as balance 
                FROM transactions 
                WHERE user_id = %s AND crypto_id = %s AND transaction_type = 'buy'
            """, (user_id, crypto_id))
            buy_balance = cursor.fetchone()['balance'] or 0
            cursor.execute("""
                SELECT SUM(quantity) as balance 
                FROM transactions 
                WHERE user_id = %s AND crypto_id = %s AND transaction_type = 'sell'
            """, (user_id, crypto_id))
            sell_balance = cursor.fetchone()['balance'] or 0
            available_balance = buy_balance - sell_balance
            if available_balance < quantity:
                flash(f'Insufficient balance. You only have {available_balance} {crypto["symbol"]} available to sell', 'danger')
                return redirect(url_for('trade'))
        # Insert transaction
        cursor.execute("""
            INSERT INTO transactions (
                user_id, 
                crypto_id, 
                transaction_type, 
                price, 
                quantity, 
                payment_method,
                status
            ) VALUES (%s, %s, %s, %s, %s, %s, 'completed')
        """, (
            user_id, 
            crypto_id, 
            trade_type, 
            float(amount), 
            float(quantity), 
            payment_method
        ))
        mysql.connection.commit()
        flash(f'{trade_type.capitalize()} order for {quantity} {crypto["symbol"]} completed successfully!', 'success')
    except Exception as e:
        print(f'Error placing order: {str(e)}')
        mysql.connection.rollback()
        flash('An error occurred while processing your order. Please try again.', 'danger')
    finally:
        cursor.close()
    return redirect(url_for('trade'))
@app.route('/sell')
def sell():
    print("sell route hit")
    render_template('sell.html')
@app.route('/wallet')
def wallet():
    print("Hello 7" )
    if 'user_id' not in session:
        flash('Please login to access this page', 'warning')
        return redirect(url_for('login'))
    return render_template('wallet.html')
@app.route('/support')
def support():
    print("Support route hit" )
    return render_template('support.html')
@app.route('/blog')
def blog():
    print("Blog route hit" )
    return render_template('blog.html')
# Error handlers
@app.errorhandler(403)
def access_forbidden(e):
    return render_template('errors/403.html'), 403
@app.errorhandler(404)
def page_not_found(e):
    return render_template('errors/404.html'), 404
@app.errorhandler(500)
def internal_server_error(e):
    return render_template('errors/500.html'), 500
if __name__ == '__main__':
    app.run(debug=True)
